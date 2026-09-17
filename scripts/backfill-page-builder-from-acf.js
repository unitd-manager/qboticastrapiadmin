#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');
const FormData = require('form-data');
const slugify = require('slugify');
const { buildPageBuilder: buildGeneratedPageBuilder } = require('./lib/acf-page-builder-mapper');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:3123';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';
const PAGE_LIMIT = toPositiveNumber(process.env.PAGE_BACKFILL_LIMIT, 0);
const PAGE_SIZE = Math.min(toPositiveNumber(process.env.PAGE_BACKFILL_BATCH_SIZE, 25), 100);
const FORCE_REBUILD = toBoolean(process.env.PAGE_BACKFILL_FORCE, false);
const DRY_RUN = toBoolean(process.env.DRY_RUN, false);
const MIGRATE_MEDIA = toBoolean(process.env.MIGRATE_MEDIA, true);
const PAGE_SLUGS = parseCsv(process.env.PAGE_BACKFILL_SLUGS || '');
const MEDIA_DOWNLOAD_TIMEOUT_MS = toPositiveNumber(process.env.MEDIA_DOWNLOAD_TIMEOUT_MS, 30000);
const MEDIA_DOWNLOAD_RETRIES = toPositiveNumber(process.env.MEDIA_DOWNLOAD_RETRIES, 2);
const PAGE_UPDATE_RETRIES = toPositiveNumber(process.env.PAGE_UPDATE_RETRIES, 2);

const HAS_EXPLICIT_WP_DB_CONFIG = Boolean(
  (process.env.WP_DB_USER || '').trim() ||
    (process.env.WP_DB_NAME || '').trim() ||
    (process.env.WP_DB_PASSWORD || '').trim()
);

const WP_DB = {
  host: HAS_EXPLICIT_WP_DB_CONFIG
    ? process.env.WP_DB_HOST || process.env.DATABASE_HOST || '127.0.0.1'
    : process.env.DATABASE_HOST || process.env.WP_DB_HOST || '127.0.0.1',
  port: HAS_EXPLICIT_WP_DB_CONFIG
    ? toPositiveNumber(process.env.WP_DB_PORT || process.env.DATABASE_PORT, 3306)
    : toPositiveNumber(process.env.DATABASE_PORT || process.env.WP_DB_PORT, 3306),
  user: HAS_EXPLICIT_WP_DB_CONFIG
    ? process.env.WP_DB_USER || process.env.DATABASE_USERNAME || ''
    : process.env.DATABASE_USERNAME || process.env.WP_DB_USER || '',
  password: HAS_EXPLICIT_WP_DB_CONFIG
    ? process.env.WP_DB_PASSWORD || process.env.DATABASE_PASSWORD || ''
    : process.env.DATABASE_PASSWORD || process.env.WP_DB_PASSWORD || '',
  database: HAS_EXPLICIT_WP_DB_CONFIG
    ? process.env.WP_DB_NAME || process.env.DATABASE_NAME || ''
    : process.env.DATABASE_NAME || process.env.WP_DB_NAME || '',
};

const uploadCache = new Map();
const stats = {
  scanned: 0,
  updated: 0,
  skippedNoAcf: 0,
  skippedNoLayouts: 0,
  skippedExistingBuilder: 0,
  failed: 0,
  failedPages: [],
  media: { uploaded: 0, skipped: 0, failed: 0 },
  failedMedia: [],
};

function toBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseCsv(value) {
  return String(value)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
}

function pickDefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slug(value, fallback = 'item') {
  const normalized = slugify(String(value || ''), { lower: true, strict: true, trim: true });
  return normalized || fallback;
}

function table(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(TABLE_PREFIX)) {
    throw new Error(`Invalid WP_TABLE_PREFIX: "${TABLE_PREFIX}"`);
  }

  return `${TABLE_PREFIX}${name}`;
}

function buildUrl(apiPath, params = {}) {
  const url = new URL(apiPath, STRAPI_URL);
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(key, String(entry)));
      return;
    }

    searchParams.append(key, String(value));
  });

  url.search = searchParams.toString();
  return url.toString();
}

function normalizeRemoteUrl(value) {
  if (!isMeaningfulValue(value)) {
    return '';
  }

  let normalized = String(value).trim();
  normalized = normalized.replace(/^[`'"\s]+/, '').replace(/[`'"\s]+$/, '');
  return normalized;
}

function summarizeError(error) {
  if (axios.isAxiosError(error)) {
    return JSON.stringify(
      pickDefined({
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
      })
    );
  }

  return error?.message || String(error);
}

function isRetryableError(error) {
  const status = error?.response?.status;
  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  const code = String(error?.code || '').toUpperCase();
  return ['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ERR_BAD_RESPONSE'].includes(code) ||
    /socket hang up|timeout|network error/i.test(String(error?.message || ''));
}

async function strapiRequest(method, apiPath, { data, params, headers } = {}) {
  const requestHeaders = { ...(headers || {}) };
  if (STRAPI_TOKEN) {
    requestHeaders.Authorization = `Bearer ${STRAPI_TOKEN}`;
  }

  try {
    const response = await axios({
      method,
      url: buildUrl(apiPath, params),
      data,
      headers: requestHeaders,
      maxBodyLength: Infinity,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const details = pickDefined({
        method: String(method || 'get').toUpperCase(),
        url: buildUrl(apiPath, params),
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        code: error.code,
      });

      throw new Error(`Strapi request failed: ${JSON.stringify(details, null, 2)}`);
    }

    throw error;
  }
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return true;
}

async function fetchPageAcfFromDb(conn, page) {
  const documentId = page?.documentId || page?.id;
  if (!documentId) {
    return null;
  }

  const [rows] = await conn.query(
    'SELECT acf FROM pages WHERE document_id = ? OR id = ? LIMIT 1',
    [String(documentId), Number.isFinite(Number(documentId)) ? Number(documentId) : -1]
  );

  const raw = rows?.[0]?.acf;
  if (!raw) {
    return null;
  }

  if (typeof raw === 'object') {
    return raw;
  }

  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function firstMeaningful(...values) {
  return values.find(isMeaningfulValue);
}

function sanitizePlainText(value) {
  if (!isMeaningfulValue(value)) {
    return undefined;
  }

  return String(value).replace(/\r\n/g, '\n').trim();
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeShortText(value, maxLength = 255) {
  const sanitized = sanitizePlainText(value);
  if (!sanitized) {
    return undefined;
  }

  const plain = stripHtml(sanitized);
  if (!plain) {
    return undefined;
  }

  return plain.length > maxLength ? plain.slice(0, maxLength) : plain;
}

function buildMenuItem(value) {
  if (!isMeaningfulValue(value)) {
    return undefined;
  }

  if (typeof value === 'string') {
    return { label: 'Learn More', url: value, targetBlank: false };
  }

  if (typeof value !== 'object') {
    return undefined;
  }

  const url = value.url || value.link || value.href;
  if (!isMeaningfulValue(url)) {
    return undefined;
  }

  return {
    label: sanitizeShortText(value.title || value.label || 'Learn More', 255) || 'Learn More',
    url,
    targetBlank: ['_blank', 'blank', true, '1', 1].includes(value.target),
  };
}

function normalizeLayoutKey(key) {
  return String(key || '')
    .replace(/__+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getLayoutField(layout, candidates) {
  const entries = Object.entries(layout.fields);

  for (const candidate of candidates) {
    if (isMeaningfulValue(layout.fields[candidate])) {
      return layout.fields[candidate];
    }

    const exactMatch = entries.find(([key, value]) => key === candidate && isMeaningfulValue(value));
    if (exactMatch) {
      return exactMatch[1];
    }

    const suffixMatch = entries.find(
      ([key, value]) => (key.endsWith(`_${candidate}`) || key.includes(`${candidate}_`)) && isMeaningfulValue(value)
    );
    if (suffixMatch) {
      return suffixMatch[1];
    }
  }

  return undefined;
}

function extractRepeaterGroups(layout) {
  const groups = {};

  for (const [key, value] of Object.entries(layout.fields)) {
    const match = key.match(/^(.*)_(\d+)_(.+)$/);
    if (!match) {
      continue;
    }

    const [, prefix, indexText, fieldName] = match;
    const index = Number(indexText);
    groups[prefix] = groups[prefix] || {};
    groups[prefix][index] = groups[prefix][index] || {};
    groups[prefix][index][fieldName] = value;
  }

  return Object.fromEntries(
    Object.entries(groups).map(([prefix, items]) => [
      prefix,
      Object.entries(items)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, item]) => item),
    ])
  );
}

function selectBestRepeater(layout) {
  const groups = extractRepeaterGroups(layout);
  const candidates = Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .sort((left, right) => right[1].length - left[1].length);

  return candidates.length > 0 ? candidates[0][1] : [];
}

function collectAttachmentIds(layout, patterns) {
  const result = [];

  for (const [key, value] of Object.entries(layout.fields)) {
    if (!patterns.some((pattern) => key.includes(pattern))) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        const parsed = Number(entry);
        if (Number.isFinite(parsed) && parsed > 0) {
          result.push(parsed);
        }
      });
      continue;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      result.push(parsed);
    }
  }

  return [...new Set(result)];
}

function getLayoutTitle(layout) {
  return sanitizeShortText(
    firstMeaningful(
      getLayoutField(layout, [
        'main_title',
        'title',
        'heading',
        'section_title',
        'common_heading',
        'hero_title',
      ]),
      layout.type.replace(/_/g, ' ')
    )
  );
}

function getLayoutSubtitle(layout) {
  return sanitizePlainText(getLayoutField(layout, ['sub_title', 'subtitle', 'tagline', 'eyebrow']));
}

function getLayoutDescription(layout) {
  return sanitizePlainText(
    getLayoutField(layout, [
      'description',
      'common_description',
      'content',
      'text',
      'body',
      'intro_text',
      'short_description',
    ])
  );
}

function resolvePageComponentType(layout) {
  const type = layout.type;

  if (/(banner|hero)/.test(type) || ['about_banner', 'solution_hero_banner_with_cta'].includes(type)) {
    return 'sections.hero';
  }

  if (type.includes('faq')) {
    return 'sections.faq-section';
  }

  if (type.includes('testimonial')) {
    return 'sections.testimonial-section';
  }

  if (
    /(gallery|logo|awards|certificate|slider|webinars_media)/.test(type) &&
    collectAttachmentIds(layout, ['image', 'logo', 'icon', 'award', 'certificate']).length > 0
  ) {
    return 'sections.gallery';
  }

  if (/(cta|form|contact)/.test(type) || ['footer_common_cta', 'info_cta_box', 'common_cta'].includes(type)) {
    return 'sections.cta';
  }

  return 'sections.features';
}

async function getAttachment(conn, attachmentId) {
  if (!attachmentId) {
    return null;
  }

  const [rows] = await conn.query(
    `
      SELECT ID, guid, post_title, post_name, post_mime_type
      FROM ${table('posts')}
      WHERE ID = ? AND post_type = 'attachment'
    `,
    [attachmentId]
  );

  return rows[0] || null;
}

function getMediaReference(entry) {
  return entry?.id || entry?.documentId || null;
}

async function uploadFileToStrapi(fileUrl, filename) {
  const normalizedUrl = normalizeRemoteUrl(fileUrl);

  if (!MIGRATE_MEDIA || !normalizedUrl) {
    stats.media.skipped += 1;
    return null;
  }

  const cacheKey = `${normalizedUrl}::${filename}`;
  if (uploadCache.has(cacheKey)) {
    stats.media.skipped += 1;
    return uploadCache.get(cacheKey);
  }

  if (DRY_RUN) {
    const dryRunFile = { id: null, documentId: `dry-run-upload-${slug(filename || 'file')}` };
    uploadCache.set(cacheKey, dryRunFile);
    stats.media.uploaded += 1;
    return dryRunFile;
  }

  for (let attempt = 1; attempt <= MEDIA_DOWNLOAD_RETRIES + 1; attempt += 1) {
    try {
      const fileResponse = await axios.get(normalizedUrl, {
        responseType: 'arraybuffer',
        timeout: MEDIA_DOWNLOAD_TIMEOUT_MS,
        maxRedirects: 5,
      });
      const form = new FormData();
      form.append('files', Buffer.from(fileResponse.data), {
        filename: filename || path.basename(new URL(normalizedUrl).pathname) || 'wordpress-file',
      });

      const uploaded = await strapiRequest('post', '/api/upload', {
        data: form,
        headers: form.getHeaders(),
      });

      const firstFile = Array.isArray(uploaded) && uploaded.length > 0 ? uploaded[0] : null;
      uploadCache.set(cacheKey, firstFile);
      stats.media.uploaded += 1;
      return firstFile;
    } catch (error) {
      const shouldRetry = attempt <= MEDIA_DOWNLOAD_RETRIES && isRetryableError(error);
      if (shouldRetry) {
        console.warn(
          `Retrying media upload (${attempt}/${MEDIA_DOWNLOAD_RETRIES + 1}) for "${normalizedUrl}": ${summarizeError(error)}`
        );
        await sleep(attempt * 1000);
        continue;
      }

      stats.media.failed += 1;
      stats.failedMedia.push({
        url: normalizedUrl,
        filename: filename || null,
        reason: summarizeError(error),
      });
      console.warn(`Failed to upload media "${normalizedUrl}":`, summarizeError(error));
      return null;
    }
  }
}

async function uploadAttachmentIdToStrapi(conn, attachmentId) {
  const normalizedId = Number(attachmentId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return null;
  }

  const attachment = await getAttachment(conn, normalizedId);
  if (!attachment?.guid) {
    return null;
  }

  return uploadFileToStrapi(
    attachment.guid,
    attachment.post_name || attachment.post_title || `attachment-${attachment.ID}`
  );
}

async function buildHeroComponent(layout, conn) {
  const imageId = firstMeaningful(
    getLayoutField(layout, [
      'image',
      'banner_image',
      'hero_image',
      'desktop_image',
      'main_image',
      'featured_image',
      'inner_video',
      'mobile_inner_video',
    ]),
    collectAttachmentIds(layout, ['image', 'video'])[0]
  );
  const uploaded = await uploadAttachmentIdToStrapi(conn, imageId);

  return pickDefined({
    __component: 'sections.hero',
    title: sanitizeShortText(getLayoutTitle(layout), 255),
    subtitle: firstMeaningful(getLayoutSubtitle(layout), getLayoutDescription(layout)),
    image: getMediaReference(uploaded),
  });
}

function buildCtaComponent(layout) {
  const button = buildMenuItem(
    firstMeaningful(
      getLayoutField(layout, ['button', 'cta_button', 'link', 'primary_button', 'secondary_button']),
      getLayoutField(layout, ['url'])
    )
  );

  return pickDefined({
    __component: 'sections.cta',
    title: sanitizeShortText(getLayoutTitle(layout), 255),
    description: getLayoutDescription(layout),
    button,
  });
}

function buildFeaturesComponent(layout) {
  return pickDefined({
    __component: 'sections.features',
    title: sanitizeShortText(getLayoutTitle(layout), 255),
    description: getLayoutDescription(layout),
    items: {
      layoutType: layout.type,
      repeaters: extractRepeaterGroups(layout),
      fields: layout.fields,
    },
  });
}

function buildFaqComponent(layout) {
  const items = selectBestRepeater(layout);

  return pickDefined({
    __component: 'sections.faq-section',
    title: sanitizeShortText(getLayoutTitle(layout), 255),
    description: getLayoutDescription(layout),
    items: items.length > 0 ? items : { layoutType: layout.type, fields: layout.fields },
  });
}

function buildTestimonialComponent(layout) {
  const testimonials = selectBestRepeater(layout);

  return pickDefined({
    __component: 'sections.testimonial-section',
    title: sanitizeShortText(getLayoutTitle(layout), 255),
    description: getLayoutDescription(layout),
    testimonials: testimonials.length > 0 ? testimonials : { layoutType: layout.type, fields: layout.fields },
  });
}

async function buildGalleryComponent(layout, conn) {
  const attachmentIds = collectAttachmentIds(layout, ['image', 'logo', 'icon', 'award', 'certificate']);
  const uploads = [];

  for (const attachmentId of attachmentIds) {
    const uploaded = await uploadAttachmentIdToStrapi(conn, attachmentId);
    if (uploaded) {
      uploads.push(getMediaReference(uploaded));
    }
  }

  if (uploads.length === 0) {
    return null;
  }

  return pickDefined({
    __component: 'sections.gallery',
    title: sanitizeShortText(getLayoutTitle(layout), 255),
    images: uploads,
  });
}

async function buildPageBuilder(acf, conn) {
  return buildGeneratedPageBuilder(acf, {
    uploadAttachmentId: async (attachmentId) => uploadAttachmentIdToStrapi(conn, attachmentId),
    uploadRemoteUrl: async (url, filename) => uploadFileToStrapi(url, filename),
    getMediaReference,
  });
}

async function* getPages() {
  if (PAGE_SLUGS.length > 0) {
    for (const pageSlug of PAGE_SLUGS) {
      const response = await strapiRequest('get', '/api/pages', {
        params: {
          'filters[slug][$eq]': pageSlug,
          'pagination[pageSize]': 1,
        },
      });

      const rows = Array.isArray(response?.data) ? response.data : [];
      if (rows.length === 0) {
        console.warn(`No page found for slug "${pageSlug}"`);
        continue;
      }

      yield rows[0];
    }

    return;
  }

  let page = 1;
  let seen = 0;

  while (true) {
    const response = await strapiRequest('get', '/api/pages', {
      params: {
        'pagination[page]': page,
        'pagination[pageSize]': PAGE_SIZE,
      },
    });

    const rows = Array.isArray(response?.data) ? response.data : [];
    if (rows.length === 0) {
      return;
    }

    for (const row of rows) {
      yield row;
      seen += 1;
      if (PAGE_LIMIT > 0 && seen >= PAGE_LIMIT) {
        return;
      }
    }

    const pageCount = Number(response?.meta?.pagination?.pageCount || page);
    if (page >= pageCount) {
      return;
    }

    page += 1;
  }
}

async function updatePageBuilder(page, pageBuilder) {
  const documentId = page.documentId || page.id;
  if (!documentId) {
    throw new Error(`Page "${page.slug || page.title || 'unknown'}" is missing documentId`);
  }

  const payload = {
    data: {
      pageBuilder,
    },
  };

  // #region debug-point A:page-update-payload
  (()=>{const fs=require('fs'),path=require('path'),p=path.join(process.cwd(),'.dbg','page-backfill-put-500.env');let u='http://127.0.0.1:7777/event',s='page-backfill-put-500';try{const e=fs.readFileSync(p,'utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'A',location:'scripts/backfill-page-builder-from-acf.js:updatePageBuilder:payload',msg:'[DEBUG] prepared pageBuilder payload',data:{slug:page.slug||null,documentId,componentCount:Array.isArray(pageBuilder)?pageBuilder.length:null,componentTypes:Array.isArray(pageBuilder)?pageBuilder.map((item)=>item?.__component||null):null,firstComponent:Array.isArray(pageBuilder)&&pageBuilder[0]&&typeof pageBuilder[0]==='object'?Object.fromEntries(Object.entries(pageBuilder[0]).slice(0,8)):null},ts:Date.now()})}).catch(()=>{})})();
  // #endregion

  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would update page "${page.slug}" with ${pageBuilder.length} components`);
    return;
  }

  let lastError = null;

  for (let attempt = 1; attempt <= PAGE_UPDATE_RETRIES + 1; attempt += 1) {
    try {
      // #region debug-point B:page-update-attempt
      (()=>{const fs=require('fs'),path=require('path'),p=path.join(process.cwd(),'.dbg','page-backfill-put-500.env');let u='http://127.0.0.1:7777/event',s='page-backfill-put-500';try{const e=fs.readFileSync(p,'utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'B',location:'scripts/backfill-page-builder-from-acf.js:updatePageBuilder:attempt',msg:'[DEBUG] sending page update request',data:{slug:page.slug||null,documentId,attempt,maxAttempts:PAGE_UPDATE_RETRIES+1},ts:Date.now()})}).catch(()=>{})})();
      // #endregion
      await strapiRequest('put', `/api/pages/${documentId}`, { data: payload });
      // #region debug-point C:page-update-success
      (()=>{const fs=require('fs'),path=require('path'),p=path.join(process.cwd(),'.dbg','page-backfill-put-500.env');let u='http://127.0.0.1:7777/event',s='page-backfill-put-500';try{const e=fs.readFileSync(p,'utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'C',location:'scripts/backfill-page-builder-from-acf.js:updatePageBuilder:success',msg:'[DEBUG] page update request succeeded',data:{slug:page.slug||null,documentId,attempt},ts:Date.now()})}).catch(()=>{})})();
      // #endregion
      return;
    } catch (error) {
      // #region debug-point D:page-update-error
      (()=>{const fs=require('fs'),path=require('path'),p=path.join(process.cwd(),'.dbg','page-backfill-put-500.env');let u='http://127.0.0.1:7777/event',s='page-backfill-put-500';try{const e=fs.readFileSync(p,'utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'D',location:'scripts/backfill-page-builder-from-acf.js:updatePageBuilder:error',msg:'[DEBUG] page update request failed',data:{slug:page.slug||null,documentId,attempt,message:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:null,status:error?.response?.status||error?.status||null,responseData:error?.response?.data||null},ts:Date.now()})}).catch(()=>{})})();
      // #endregion
      lastError = error;
      const shouldRetry = attempt <= PAGE_UPDATE_RETRIES && isRetryableError(error);
      if (shouldRetry) {
        console.warn(
          `Retrying page update (${attempt}/${PAGE_UPDATE_RETRIES + 1}) for "${page.slug}": ${summarizeError(error)}`
        );
        await sleep(attempt * 1000);
        continue;
      }
      break;
    }
  }

  throw lastError;
}

function shouldProcessPage(page) {
  if (PAGE_SLUGS.length === 0) {
    return true;
  }

  return PAGE_SLUGS.includes(String(page.slug || '').toLowerCase());
}

async function main() {
  if (!STRAPI_TOKEN && !DRY_RUN) {
    throw new Error('Missing required environment variable: STRAPI_API_TOKEN');
  }

  if (!WP_DB.user) {
    throw new Error('Missing required database credentials for attachment lookup');
  }

  console.log(
    JSON.stringify(
      {
        mode: DRY_RUN ? 'dry-run' : 'write',
        strapiUrl: STRAPI_URL,
        pageLimit: PAGE_LIMIT || null,
        pageBatchSize: PAGE_SIZE,
        forceRebuild: FORCE_REBUILD,
        pageSlugs: PAGE_SLUGS,
      },
      null,
      2
    )
  );

  const conn = await mysql.createConnection(WP_DB);

  try {
    for await (const page of getPages()) {
      if (!shouldProcessPage(page)) {
        continue;
      }

      stats.scanned += 1;

      if (!page.acf || typeof page.acf !== 'object') {
        try {
          const fetchedAcf = await fetchPageAcfFromDb(conn, page);
          if (fetchedAcf && typeof fetchedAcf === 'object') {
            page.acf = fetchedAcf;
          }
        } catch {}
      }

      if (!page.acf || typeof page.acf !== 'object') {
        stats.skippedNoAcf += 1;
        continue;
      }

      if (!FORCE_REBUILD && Array.isArray(page.pageBuilder) && page.pageBuilder.length > 0) {
        stats.skippedExistingBuilder += 1;
        continue;
      }

      const pageBuilder = await buildPageBuilder(page.acf, conn);
      if (pageBuilder.length === 0) {
        stats.skippedNoLayouts += 1;
        continue;
      }

      try {
        await updatePageBuilder(page, pageBuilder);
        stats.updated += 1;
        console.log(`Updated pageBuilder for "${page.slug}" with ${pageBuilder.length} components`);
      } catch (error) {
        stats.failed += 1;
        stats.failedPages.push({
          slug: page.slug || null,
          title: page.title || null,
          reason: summarizeError(error),
        });
        console.error(`Failed to update "${page.slug}": ${error.message || error}`);
      }
    }
  } finally {
    await conn.end();
  }

  console.log('Backfill summary:');
  console.log(JSON.stringify(stats, null, 2));

  if (stats.failedPages.length > 0) {
    console.log('Failed pages:');
    console.log(JSON.stringify(stats.failedPages, null, 2));
  }

  if (stats.failedMedia.length > 0) {
    console.log('Failed media:');
    console.log(JSON.stringify(stats.failedMedia, null, 2));
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error.message || error);
  process.exit(1);
});

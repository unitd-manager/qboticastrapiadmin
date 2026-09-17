#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
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
const PAGE_TYPE = process.env.WP_PAGE_TYPE || process.env.HOME_PAGE_TYPE || 'page';
const PAGE_SLUGS = parseCsv(process.env.WP_PAGE_SLUGS || process.env.HOME_PAGE_SLUGS || '');
const DRY_RUN = toBoolean(process.env.DRY_RUN, false);
const MIGRATE_MEDIA = toBoolean(process.env.MIGRATE_MEDIA, true);
const MEDIA_DOWNLOAD_TIMEOUT_MS = toPositiveNumber(process.env.MEDIA_DOWNLOAD_TIMEOUT_MS, 30000);
const MEDIA_DOWNLOAD_RETRIES = toPositiveNumber(process.env.MEDIA_DOWNLOAD_RETRIES, 2);
const MEDIA_RETRY_BASE_DELAY_MS = toPositiveNumber(process.env.MEDIA_RETRY_BASE_DELAY_MS, 1000);
const MEDIA_UPLOAD_PAUSE_MS = toPositiveNumber(process.env.MEDIA_UPLOAD_PAUSE_MS, 120);
const MEDIA_STRICT = toBoolean(process.env.MEDIA_STRICT, false);
const PAGE_UPDATE_RETRIES = toPositiveNumber(process.env.PAGE_UPDATE_RETRIES, 2);
const STRAPI_REQUEST_TIMEOUT_MS = toPositiveNumber(process.env.STRAPI_REQUEST_TIMEOUT_MS, 90000);
const STRAPI_REQUEST_RETRIES = toPositiveNumber(process.env.STRAPI_REQUEST_RETRIES, 2);
const PAGE_UPDATE_TIMEOUT_MS = toPositiveNumber(process.env.PAGE_UPDATE_TIMEOUT_MS, 600000);
const PAGE_VERIFY_DELAY_MS = toPositiveNumber(process.env.PAGE_VERIFY_DELAY_MS, 3000);
const HTTP_KEEP_ALIVE = toBoolean(process.env.HTTP_KEEP_ALIVE, false);

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
const HTTP_AGENT = new http.Agent({ keepAlive: HTTP_KEEP_ALIVE, maxSockets: 4 });
const HTTPS_AGENT = new https.Agent({ keepAlive: HTTP_KEEP_ALIVE, maxSockets: 4 });

const stats = {
  pagesScanned: 0,
  pagesMatched: 0,
  acfKeys: 0,
  pageBuilderComponents: 0,
  updated: 0,
  skippedNoTarget: 0,
  skippedEmptyBuilder: 0,
  failed: 0,
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
  return String(value || '')
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

function table(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(TABLE_PREFIX)) {
    throw new Error(`Invalid WP_TABLE_PREFIX: "${TABLE_PREFIX}"`);
  }

  return `${TABLE_PREFIX}${name}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function pickDefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function summarizeError(error) {
  if (axios.isAxiosError(error)) {
    return JSON.stringify(
      pickDefined({
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
      })
    );
  }

  return error?.message || String(error);
}

function normalizeRemoteUrl(value) {
  if (!isMeaningfulValue(value)) {
    return '';
  }

  let normalized = String(value).trim();
  normalized = normalized.replace(/^[`'"\s]+/, '').replace(/[`'"\s]+$/, '');
  return normalized;
}

function slug(value, fallback = 'item') {
  const normalized = slugify(String(value || ''), { lower: true, strict: true, trim: true });
  return normalized || fallback;
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

async function strapiRequest(method, apiPath, { data, params, headers, timeoutMs } = {}) {
  const requestHeaders = { ...(headers || {}) };
  if (STRAPI_TOKEN) {
    requestHeaders.Authorization = `Bearer ${STRAPI_TOKEN}`;
  }

  let lastError = null;

  for (let attempt = 1; attempt <= STRAPI_REQUEST_RETRIES + 1; attempt += 1) {
    try {
      const response = await axios({
        method,
        url: buildUrl(apiPath, params),
        data,
        headers: requestHeaders,
        maxBodyLength: Infinity,
        timeout: timeoutMs || STRAPI_REQUEST_TIMEOUT_MS,
        httpAgent: HTTP_AGENT,
        httpsAgent: HTTPS_AGENT,
      });

      return response.data;
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt <= STRAPI_REQUEST_RETRIES && isRetryableError(error);
      if (shouldRetry) {
        await sleep(attempt * 500);
        continue;
      }
      break;
    }
  }

  throw lastError;
}

function normalizeMetaValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  if (/^[abisdNO]:/.test(trimmed)) {
    try {
      return parsePhpSerialized(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function parsePhpSerialized(input) {
  let index = 0;

  function expect(char) {
    if (input[index] !== char) {
      throw new Error(`Expected "${char}" at position ${index}`);
    }
    index += 1;
  }

  function readUntil(char) {
    const endIndex = input.indexOf(char, index);
    if (endIndex === -1) {
      throw new Error(`Could not find "${char}" after position ${index}`);
    }
    const result = input.slice(index, endIndex);
    index = endIndex + 1;
    return result;
  }

  function parseValue() {
    const type = input[index];
    index += 2;

    switch (type) {
      case 'N':
        return null;
      case 'b':
        return readUntil(';') === '1';
      case 'i':
        return Number(readUntil(';'));
      case 'd':
        return Number(readUntil(';'));
      case 's': {
        const byteLength = Number(readUntil(':'));
        expect('"');
        const value = input.slice(index, index + byteLength);
        index += byteLength;
        expect('"');
        expect(';');
        return value;
      }
      case 'a': {
        const count = Number(readUntil(':'));
        expect('{');
        const items = [];
        const object = {};
        let isSequentialArray = true;

        for (let i = 0; i < count; i += 1) {
          const key = parseValue();
          const value = parseValue();
          object[key] = value;
          items.push([key, value]);
          if (!Number.isInteger(key) || key !== i) {
            isSequentialArray = false;
          }
        }

        expect('}');
        return isSequentialArray ? items.map(([, value]) => value) : object;
      }
      default:
        throw new Error(`Unsupported PHP serialized type "${type}"`);
    }
  }

  return parseValue();
}

async function getWordPressPages(conn) {
  const params = [PAGE_TYPE];
  let slugClause = '';

  if (PAGE_SLUGS.length > 0) {
    slugClause = ` AND post_name IN (${PAGE_SLUGS.map(() => '?').join(', ')})`;
    params.push(...PAGE_SLUGS);
  }

  const [rows] = await conn.query(
    `
      SELECT ID, post_title, post_name, post_content, post_excerpt, guid
      FROM ${table('posts')}
      WHERE post_type = ?${slugClause}
      ORDER BY ID ASC
    `,
    params
  );

  return rows;
}

async function getPostMeta(conn, postId) {
  const [metaRows] = await conn.query(
    `SELECT meta_key, meta_value FROM ${table('postmeta')} WHERE post_id = ?`,
    [postId]
  );

  const acf = {};

  for (const meta of metaRows) {
    if (!meta.meta_key || meta.meta_key.startsWith('_')) {
      continue;
    }

    acf[meta.meta_key] = normalizeMetaValue(meta.meta_value);
  }

  return acf;
}

async function getAttachment(conn, attachmentId) {
  if (!attachmentId) {
    return null;
  }

  const [rows] = await conn.query(
    `
      SELECT ID, guid, post_title, post_name
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

  const cacheKey = `${normalizedUrl}::${filename || ''}`;
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
        httpAgent: HTTP_AGENT,
        httpsAgent: HTTPS_AGENT,
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
      if (MEDIA_UPLOAD_PAUSE_MS > 0) {
        await sleep(MEDIA_UPLOAD_PAUSE_MS);
      }
      return firstFile;
    } catch (error) {
      const shouldRetry = attempt <= MEDIA_DOWNLOAD_RETRIES && isRetryableError(error);
      if (shouldRetry) {
        console.warn(
          `Retrying media upload (${attempt}/${MEDIA_DOWNLOAD_RETRIES + 1}) for "${normalizedUrl}": ${summarizeError(error)}`
        );
        await sleep((attempt + 1) * MEDIA_RETRY_BASE_DELAY_MS);
        continue;
      }

      stats.media.failed += 1;
      stats.failedMedia.push({
        url: normalizedUrl,
        filename: filename || null,
        reason: summarizeError(error),
      });
      console.warn(`Failed to upload media "${normalizedUrl}": ${summarizeError(error)}`);
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

async function getStrapiPageBySlug(slug) {
  const response = await strapiRequest('get', '/api/pages', {
    params: {
      'filters[slug][$eq]': slug,
      'pagination[pageSize]': 1,
    },
  });

  const rows = Array.isArray(response?.data) ? response.data : [];
  return rows[0] || null;
}

async function isPageUpdateApplied(targetPage, expected) {
  const documentId = targetPage.documentId || targetPage.id;

  if (!documentId) {
    return false;
  }

  const response = await strapiRequest(
    'get',
    `/api/pages/${documentId}`,
    {
      params: {
        populate: 'pageBuilder',
      },
    }
  );

  const row = response?.data || null;

  if (!row || typeof row !== 'object') {
    return false;
  }

  const actualBuilderLength = Array.isArray(row.pageBuilder)
    ? row.pageBuilder.length
    : 0;

  return actualBuilderLength === expected.pageBuilderLength;
}

async function updatePage(targetPage, payload) {
  const documentId = targetPage.documentId || targetPage.id;
  if (!documentId) {
    throw new Error('Target Strapi page is missing documentId/id');
  }

  if (DRY_RUN) {
    console.log(
      `[DRY_RUN] Would update page slug="${targetPage.slug || documentId}" with ${payload.data.pageBuilder.length} pageBuilder components`
    );
    return;
  }

  const expected = {
    pageBuilderLength: Array.isArray(payload?.data?.pageBuilder)
      ? payload.data.pageBuilder.length
      : 0,
  };

  let lastError = null;

  for (let attempt = 1; attempt <= PAGE_UPDATE_RETRIES + 1; attempt += 1) {
    try {
      await strapiRequest('put', `/api/pages/${documentId}`, {
        data: payload,
        timeoutMs: PAGE_UPDATE_TIMEOUT_MS,
      });
      return;
    } catch (error) {
      lastError = error;

      // A timed-out client request can still succeed server-side. Verify before retrying.
      if (attempt <= PAGE_UPDATE_RETRIES) {
        await sleep(PAGE_VERIFY_DELAY_MS);
        try {
          const applied = await isPageUpdateApplied(targetPage, expected);
          if (applied) {
            console.log(`Page update verified as applied after transient error on attempt ${attempt}.`);
            return;
          }
        } catch (verifyError) {
          console.warn(`Post-error verification failed: ${summarizeError(verifyError)}`);
        }
      }

      const shouldRetry = attempt <= PAGE_UPDATE_RETRIES && isRetryableError(error);
      if (shouldRetry) {
        console.warn(
          `Retrying page update (${attempt}/${PAGE_UPDATE_RETRIES + 1}) for slug="${targetPage.slug || documentId}": ${summarizeError(error)}`
        );
        await sleep(attempt * 1000);
        continue;
      }

      break;
    }
  }

  throw lastError;
}

async function processWordPressPage(conn, wpPage) {
  stats.pagesScanned += 1;

  const slug = wpPage.post_name || '';
  if (!slug) {
    stats.skippedNoTarget += 1;
    console.warn(`Skipping WordPress page ID ${wpPage.ID}: missing slug`);
    return;
  }

  const strapiPage = await getStrapiPageBySlug(slug);
  if (!strapiPage) {
    stats.skippedNoTarget += 1;
    console.warn(`Skipping WordPress page "${slug}": no matching Strapi page found`);
    return;
  }

  stats.pagesMatched += 1;

  const acf = await getPostMeta(conn, wpPage.ID);
  acf._migration_page = {
    wp_id: wpPage.ID,
    slug,
    title: wpPage.post_title || null,
    excerpt: wpPage.post_excerpt || null,
    run_id: `page-migrate-${wpPage.ID}-${Date.now()}`,
    migrated_at: new Date().toISOString(),
  };

  stats.acfKeys = Math.max(stats.acfKeys, Object.keys(acf).length);

  const pageBuilder = await buildGeneratedPageBuilder(acf, {
    uploadAttachmentId: async (attachmentId) => uploadAttachmentIdToStrapi(conn, attachmentId),
    uploadRemoteUrl: async (url, filename) => uploadFileToStrapi(url, filename),
    getMediaReference,
  });

  if (!Array.isArray(pageBuilder) || pageBuilder.length === 0) {
    stats.skippedEmptyBuilder += 1;
    console.warn(`Skipping page "${slug}": pageBuilder generated 0 components`);
    return;
  }

  stats.pageBuilderComponents += pageBuilder.length;

  const payload = {
    data: {
      title: wpPage.post_title || strapiPage.title,
      pageBuilder,
    },
  };

  await updatePage({ ...strapiPage, slug }, payload);
  stats.updated += 1;

  console.log(`Migrated page "${slug}" with ${pageBuilder.length} components.`);
}

async function main() {
  if (!STRAPI_TOKEN && !DRY_RUN) {
    throw new Error('Missing required environment variable: STRAPI_API_TOKEN');
  }

  if (!WP_DB.user) {
    throw new Error('Missing required database credentials for WordPress lookup');
  }

  console.log(
    JSON.stringify(
      {
        mode: DRY_RUN ? 'dry-run' : 'write',
        strapiUrl: STRAPI_URL,
        wpDbHost: WP_DB.host,
        wpDbName: WP_DB.database,
        pageType: PAGE_TYPE,
        pageSlugs: PAGE_SLUGS,
        migrateMedia: MIGRATE_MEDIA,
        mediaStrict: MEDIA_STRICT,
        mediaRetries: MEDIA_DOWNLOAD_RETRIES,
      },
      null,
      2
    )
  );

  const conn = await mysql.createConnection(WP_DB);

  try {
    const wpPages = await getWordPressPages(conn);
    if (!Array.isArray(wpPages) || wpPages.length === 0) {
      throw new Error(
        `WordPress pages not found for type "${PAGE_TYPE}"${PAGE_SLUGS.length > 0 ? ` and slugs "${PAGE_SLUGS.join(', ')}"` : ''}`
      );
    }

    for (const wpPage of wpPages) {
      try {
        await processWordPressPage(conn, wpPage);
      } catch (error) {
        stats.failed += 1;
        console.error(`Failed to migrate page "${wpPage.post_name || wpPage.ID}":`, error.message || error);
      }
    }

    console.log(`Page migration completed for ${stats.updated} pages.`);
  } finally {
    await conn.end();
  }

  console.log('Migration summary:');
  console.log(JSON.stringify(stats, null, 2));

  if (stats.failedMedia.length > 0) {
    console.log('Failed media uploads:');
    console.log(JSON.stringify(stats.failedMedia, null, 2));

    if (MEDIA_STRICT) {
      throw new Error(`MEDIA_STRICT is enabled and ${stats.failedMedia.length} media uploads failed`);
    }
  }
}

main().catch((error) => {
  console.error('Page migration failed:', error.message || error);
  process.exit(1);
});

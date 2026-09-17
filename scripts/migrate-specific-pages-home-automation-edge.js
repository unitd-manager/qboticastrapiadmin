#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');
const FormData = require('form-data');
const { buildPageBuilder, loadManifest } = require('./lib/acf-page-builder-mapper');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:3123';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';
const DRY_RUN = toBoolean(process.env.DRY_RUN, false);
const MIGRATE_MEDIA = toBoolean(process.env.MIGRATE_MEDIA, true);
const MEDIA_DOWNLOAD_TIMEOUT_MS = toPositiveNumber(process.env.MEDIA_DOWNLOAD_TIMEOUT_MS, 30000);
const MEDIA_DOWNLOAD_RETRIES = toPositiveNumber(process.env.MEDIA_DOWNLOAD_RETRIES, 2);
const MEDIA_DOWNLOAD_DELAY_MS = toPositiveNumber(process.env.MEDIA_DOWNLOAD_DELAY_MS, 150);
const WP_BASE_URL = process.env.WP_BASE_URL || '';

const WP_PAGE_IDS = parseCsvNumbers(process.env.WP_PAGE_IDS || '') || [60, 2071, 6521, 6837, 7163, 7417];

const uploadCache = new Map();
const stats = {
  pages: { updated: 0, failed: 0 },
  media: { uploaded: 0, skipped: 0, failed: 0 },
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const contents = fs.readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
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
    process.env[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)"$/, '$1');
  }
}

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

function parseCsvNumbers(value) {
  const parsed = String(value || '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

  return parsed.length > 0 ? parsed : null;
}

function pickDefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function table(name) {
  return `${TABLE_PREFIX}${name}`;
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

      const wrappedError = new Error(`Strapi request failed: ${JSON.stringify(details, null, 2)}`);
      wrappedError.cause = error;
      throw wrappedError;
    }
    throw error;
  }
}

function getMediaReference(entry) {
  return entry?.id || entry?.documentId || null;
}

function normalizeRemoteUrl(value) {
  if (!isMeaningfulValue(value)) {
    return '';
  }
  let normalized = String(value || '').trim();
  normalized = normalized
    .replace(/^[\s`"'“”‘’]+/, '')
    .replace(/[\s`"'“”‘’]+$/, '')
    .trim();
  return normalized;
}

function looksLikeMediaUrl(url) {
  const normalized = String(url || '');
  if (!normalized) {
    return false;
  }
  if (/\/wp-content\/uploads\//i.test(normalized)) {
    return true;
  }
  return /\.(avif|bmp|gif|jpe?g|png|webp|svg|pdf|mp4|mov|m4v|mp3|wav|ogg|webm|zip|docx?|pptx?|xlsx?)($|\?)/i.test(normalized);
}

function resolveRemoteUrl(urlValue, baseUrl) {
  const trimmed = normalizeRemoteUrl(urlValue);
  if (!trimmed) {
    return null;
  }
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  const base = normalizeRemoteUrl(baseUrl) || normalizeRemoteUrl(WP_BASE_URL);
  if (!base) {
    return null;
  }
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return null;
  }
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
    const dryRunFile = { id: null, documentId: `dry-run-upload-${filename}` };
    uploadCache.set(cacheKey, dryRunFile);
    stats.media.uploaded += 1;
    return dryRunFile;
  }

  for (let attempt = 1; attempt <= MEDIA_DOWNLOAD_RETRIES + 1; attempt += 1) {
    try {
      if (MEDIA_DOWNLOAD_DELAY_MS > 0) {
        await sleep(MEDIA_DOWNLOAD_DELAY_MS);
      }
      const fileResponse = await axios.get(normalizedUrl, {
        responseType: 'arraybuffer',
        timeout: MEDIA_DOWNLOAD_TIMEOUT_MS,
        maxRedirects: 5,
        headers: {
          Accept: '*/*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        },
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
      if (attempt <= MEDIA_DOWNLOAD_RETRIES) {
        console.warn(
          `Retrying media upload (${attempt}/${MEDIA_DOWNLOAD_RETRIES + 1}): ${error.message}`
        );
        await sleep(attempt * 1000);
        continue;
      }
      stats.media.failed += 1;
      console.warn(`Failed to upload media: ${error.message}`);
      return null;
    }
  }
}

async function getAttachment(conn, attachmentId) {
  if (!attachmentId) {
    return null;
  }
  const [rows] = await conn.query(
    `SELECT ID, guid, post_title, post_name, post_mime_type FROM ${table('posts')} WHERE ID = ? AND post_type = 'attachment'`,
    [attachmentId]
  );
  return rows[0] || null;
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

async function getPostMeta(conn, postId) {
  const [metaRows] = await conn.query(
    `SELECT meta_key, meta_value FROM ${table('postmeta')} WHERE post_id = ?`,
    [postId]
  );

  const acf = {};
  for (const meta of metaRows) {
    if (!meta.meta_key) {
      continue;
    }
    if (meta.meta_key.startsWith('_')) {
      continue;
    }
    acf[meta.meta_key] = normalizeMetaValue(meta.meta_value);
  }
  return acf;
}

async function processPage(conn, wpPageId) {
  try {
    console.log(`\nProcessing WordPress page ID: ${wpPageId}`);

    // Get WordPress post data
    const [wpPosts] = await conn.query(
      `SELECT ID, post_title, post_name FROM ${table('posts')} WHERE ID = ?`,
      [wpPageId]
    );

    if (wpPosts.length === 0) {
      console.log(`  WordPress page not found!`);
      return;
    }
    const wpPost = wpPosts[0];
    console.log(`  Post title: ${wpPost.post_title}`);
    console.log(`  Post slug: ${wpPost.post_name}`);

    // Get Strapi page
    const strapiResponse = await strapiRequest('get', '/api/pages', {
      params: {
      'filters[slug][$eq]': wpPost.post_name,
      'pagination[pageSize]': 1,
      },
    });

    if (!Array.isArray(strapiResponse?.data) || strapiResponse.data.length === 0) {
      console.log(`  Strapi page not found!`);
      stats.pages.failed += 1;
      return;
    }

    const strapiPage = strapiResponse.data[0];
    console.log(`  Strapi page ID: ${strapiPage.id}`);

    // Get WordPress postmeta
    const acf = await getPostMeta(conn, wpPageId);

    // Build page builder
    const pageBuilder = await buildPageBuilder(acf, {
      uploadAttachmentId: async (id) => uploadAttachmentIdToStrapi(conn, id),
      uploadRemoteUrl: async (url, filename) => uploadFileToStrapi(url, filename),
      getMediaReference,
    });

    if (pageBuilder.length > 0) {
      console.log(`  Built page builder with ${pageBuilder.length} components`);

      if (!DRY_RUN) {
        await strapiRequest('put', `/api/pages/${strapiPage.documentId || strapiPage.id}`, {
          data: { data: { pageBuilder } },
        });
      }

      console.log(`  Page updated successfully!`);
      stats.pages.updated += 1;
    } else {
      console.log(`  No page builder components found!`);
    }
  } catch (error) {
    console.error(`  Failed to process page: ${error.message}`);
    stats.pages.failed += 1;
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
  });

  try {
    for (const pageId of WP_PAGE_IDS) {
      await processPage(conn, pageId);
    }

    console.log('\nMigration summary:', JSON.stringify(stats, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

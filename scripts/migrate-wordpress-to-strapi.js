#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const slugify = require('slugify');
const axios = require('axios');
const FormData = require('form-data');
const { buildPageBuilder: buildGeneratedPageBuilder } = require('./lib/acf-page-builder-mapper');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:3123';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';
const DRY_RUN = toBoolean(process.env.DRY_RUN, false);
const SKIP_EXISTING = toBoolean(process.env.SKIP_EXISTING, true);
const MIGRATE_MEDIA = toBoolean(process.env.MIGRATE_MEDIA, true);
const WP_BASE_URL = process.env.WP_BASE_URL || '';
const MEDIA_DOWNLOAD_TIMEOUT_MS = toPositiveNumber(process.env.MEDIA_DOWNLOAD_TIMEOUT_MS, 30000);
const MEDIA_DOWNLOAD_RETRIES = toPositiveNumber(process.env.MEDIA_DOWNLOAD_RETRIES, 2);
const MEDIA_DOWNLOAD_DELAY_MS = toPositiveNumber(process.env.MEDIA_DOWNLOAD_DELAY_MS, 150);
const STRAPI_REQUEST_RETRIES = toPositiveNumber(process.env.STRAPI_REQUEST_RETRIES, 2);
const WP_DB_RETRIES = toPositiveNumber(process.env.WP_DB_RETRIES, 2);
const MIGRATE_TYPES = parseCsv(process.env.MIGRATE_TYPES || 'categories,tags,authors,pages,posts,menus');
const PAGE_POST_TYPE = process.env.WP_PAGE_TYPE || 'page';
const BLOG_POST_TYPE = process.env.WP_BLOG_TYPE || 'post';
const PUBLISHED_ONLY = toBoolean(process.env.WP_PUBLISHED_ONLY, true);
const POST_LIMIT = toPositiveNumber(process.env.WP_LIMIT, 0);
const WP_MENU_IDS = parseCsv(process.env.WP_MENU_IDS || '')
  .map((value) => Number(value))
  .filter((value) => Number.isFinite(value) && value > 0);
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

const SCHEMA_BY_API = {
  page: loadSchema('page'),
  post: loadSchema('post'),
  category: loadSchema('category'),
  tag: loadSchema('tag'),
  author: loadSchema('author'),
  menu: loadSchema('menu'),
};

const uploadCache = new Map();
const stats = {
  categories: { created: 0, skipped: 0 },
  tags: { created: 0, skipped: 0 },
  authors: { created: 0, skipped: 0 },
  pages: { created: 0, skipped: 0, updated: 0 },
  posts: { created: 0, skipped: 0 },
  menus: { created: 0, skipped: 0 },
  media: { uploaded: 0, skipped: 0, failed: 0 },
};

function isRetryableWpDbError(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '');

  if (
    [
      'PROTOCOL_CONNECTION_LOST',
      'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
      'PROTOCOL_ENQUEUE_AFTER_QUIT',
      'ECONNRESET',
      'ETIMEDOUT',
      'EPIPE',
    ].includes(code)
  ) {
    return true;
  }

  return /closed state|server has gone away|lost connection|cannot enqueue|connection.*closed/i.test(message);
}

function createWordPressClient(config) {
  let activeConnection = null;
  let pendingConnection = null;

  async function resetConnection() {
    const previous = activeConnection;
    activeConnection = null;
    pendingConnection = null;

    if (!previous) {
      return;
    }

    try {
      await previous.end();
    } catch {
      try {
        previous.destroy();
      } catch {}
    }
  }

  async function getConnection() {
    if (activeConnection) {
      return activeConnection;
    }

    if (!pendingConnection) {
      pendingConnection = mysql.createConnection(config)
        .then((connection) => {
          activeConnection = connection;
          return connection;
        })
        .finally(() => {
          pendingConnection = null;
        });
    }

    return pendingConnection;
  }

  return {
    async query(sql, params) {
      for (let attempt = 1; attempt <= WP_DB_RETRIES + 1; attempt += 1) {
        const connection = await getConnection();

        try {
          return await connection.query(sql, params);
        } catch (error) {
          if (attempt <= WP_DB_RETRIES && isRetryableWpDbError(error)) {
            console.warn(
              `Retrying WordPress DB query (${attempt}/${WP_DB_RETRIES + 1}): ${error.message || error}`
            );
            await resetConnection();
            await sleep(500 * attempt);
            continue;
          }

          throw error;
        }
      }

      throw new Error('WordPress DB query retry loop exited unexpectedly');
    },
    async end() {
      await resetConnection();
    },
  };
}

function toBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

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

    const value = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    process.env[key] = value;
  }
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

function loadSchema(apiName) {
  const schemaPath = path.join(
    ROOT,
    'src',
    'api',
    apiName,
    'content-types',
    apiName,
    'schema.json'
  );

  if (!fs.existsSync(schemaPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

function hasAttribute(apiName, attributeName) {
  return Boolean(SCHEMA_BY_API[apiName]?.attributes?.[attributeName]);
}

function getCollectionPath(apiName) {
  const pluralName = SCHEMA_BY_API[apiName]?.info?.pluralName;

  if (!pluralName) {
    throw new Error(`Could not resolve Strapi collection path for "${apiName}"`);
  }

  return `/api/${pluralName}`;
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

  const url = buildUrl(apiPath, params);
  // #region debug-point A:request
  (()=>{const p=path.join(ROOT,'.dbg','migration-404.env');let u='http://127.0.0.1:7777/event',s='migration-404';try{const e=fs.readFileSync(p,'utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'A',location:'scripts/migrate-wordpress-to-strapi.js:strapiRequest',msg:'[DEBUG] Strapi request start',data:{method,url,apiPath,hasAuth:Boolean(STRAPI_TOKEN),hasBody:Boolean(data),queryKeys:params?Object.keys(params):[]},ts:Date.now()})}).catch(()=>{})})();
  // #endregion
  for (let attempt = 1; attempt <= STRAPI_REQUEST_RETRIES + 1; attempt += 1) {
    try {
      const response = await axios({
        method,
        url,
        data,
        headers: requestHeaders,
        maxBodyLength: Infinity,
      });

      return response.data;
    } catch (error) {
      // #region debug-point B:error
      (()=>{const p=path.join(ROOT,'.dbg','migration-404.env');let u='http://127.0.0.1:7777/event',s='migration-404';try{const e=fs.readFileSync(p,'utf8');u=e.match(/DEBUG_SERVER_URL=(.+)/)?.[1]||u;s=e.match(/DEBUG_SESSION_ID=(.+)/)?.[1]||s}catch{}fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:s,runId:'pre-fix',hypothesisId:'B',location:'scripts/migrate-wordpress-to-strapi.js:strapiRequest',msg:'[DEBUG] Strapi request failed',data:{method,url,apiPath,attempt,maxAttempts:STRAPI_REQUEST_RETRIES+1,status:error?.response?.status,statusText:error?.response?.statusText,responseData:error?.response?.data},ts:Date.now()})}).catch(()=>{})})();
      // #endregion
      if (attempt <= STRAPI_REQUEST_RETRIES && isRetryableError(error)) {
        await sleep(500 * attempt);
        continue;
      }

      if (axios.isAxiosError(error)) {
        const details = pickDefined({
          method: String(method || 'get').toUpperCase(),
          url,
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

function extractSeo(metaRows) {
  const metaByKey = Object.fromEntries(
    metaRows.filter((item) => item.meta_key).map((item) => [item.meta_key, item.meta_value])
  );

  return {
    title:
      metaByKey._yoast_wpseo_title ||
      metaByKey.rank_math_title ||
      metaByKey.seo_title ||
      metaByKey.seoTitle,
    description:
      metaByKey._yoast_wpseo_metadesc ||
      metaByKey.rank_math_description ||
      metaByKey.seo_description ||
      metaByKey.seoDescription,
    canonicalUrl:
      metaByKey._yoast_wpseo_canonical ||
      metaByKey.rank_math_canonical_url ||
      metaByKey.rank_math_canonical ||
      metaByKey.canonicalUrl,
    keywords:
      metaByKey.rank_math_focus_keyword ||
      metaByKey.rank_math_keyword ||
      metaByKey.rank_math_keywords ||
      metaByKey.focus_keyword ||
      metaByKey.seo_keywords ||
      metaByKey.keywords,
    seoScore:
      metaByKey.rank_math_seo_score ||
      metaByKey.rank_math_seoscore ||
      metaByKey.seo_score,
    contentAiScore:
      metaByKey.rank_math_contentai_score ||
      metaByKey.rank_math_contentai ||
      metaByKey.contentAiScore,
  };
}

async function getExistingByField(apiName, field, value) {
  if (!field || value === undefined || value === null || value === '') {
    return null;
  }

  const response = await strapiRequest('get', getCollectionPath(apiName), {
    params: {
      [`filters[${field}][$eq]`]: value,
      'pagination[pageSize]': 1,
    },
  });

  if (Array.isArray(response?.data) && response.data.length > 0) {
    return response.data[0];
  }

  return null;
}

function getEntryReference(entry) {
  return entry?.documentId || entry?.id || null;
}

function getMediaReference(entry) {
  return entry?.id || entry?.documentId || null;
}

function extractInvalidPayloadKeys(error) {
  const invalidKeys = [];
  const responseData = error?.response?.data;
  const message = String(responseData?.error?.message || error?.message || '');
  const detailKey = responseData?.error?.details?.key;

  if (detailKey) {
    invalidKeys.push(String(detailKey));
  }

  const messageMatches = message.match(/invalid key\s+([a-zA-Z0-9_\-]+)/gi) || [];
  for (const match of messageMatches) {
    const key = match.replace(/^invalid key\s+/i, '').trim();
    if (key) {
      invalidKeys.push(key);
    }
  }

  return [...new Set(invalidKeys.filter(Boolean))];
}

function stripUnsupportedPayloadFields(payload, invalidKeys) {
  const keys = [...new Set((invalidKeys || []).filter(Boolean))];
  if (!payload || typeof payload !== 'object' || keys.length === 0) {
    return payload;
  }

  const sanitizeValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const result = {};
    for (const [entryKey, entryValue] of Object.entries(value)) {
      if (keys.includes(entryKey)) {
        continue;
      }

      result[entryKey] = sanitizeValue(entryValue);
    }

    return result;
  };

  const sanitized = sanitizeValue(payload);
  return sanitized;
}

async function createIfMissing(apiName, uniqueField, uniqueValue, payload, statsKey) {
  if (DRY_RUN) {
    stats[statsKey].created += 1;
    console.log(
      `[DRY_RUN] create ${apiName}:`,
      JSON.stringify({ uniqueField, uniqueValue, payload }, null, 2).slice(0, 4000)
    );
    return {
      id: null,
      documentId: `dry-run-${apiName}-${uniqueValue || Date.now()}`,
      ...payload.data,
    };
  }

  if (SKIP_EXISTING) {
    const existing = await getExistingByField(apiName, uniqueField, uniqueValue);

    if (existing) {
      stats[statsKey].skipped += 1;
      console.log(`Skipped existing ${apiName}: ${uniqueValue}`);
      return existing;
    }
  }

  let created;
  try {
    created = await strapiRequest('post', getCollectionPath(apiName), { data: payload });
  } catch (error) {
    const invalidKeys = extractInvalidPayloadKeys(error);
    if (invalidKeys.length > 0) {
      const sanitizedPayload = stripUnsupportedPayloadFields(payload, invalidKeys);
      if (sanitizedPayload && JSON.stringify(sanitizedPayload) !== JSON.stringify(payload)) {
        console.warn(`Retrying create for ${apiName} after removing unsupported fields: ${invalidKeys.join(', ')}`);
        try {
          created = await strapiRequest('post', getCollectionPath(apiName), { data: sanitizedPayload });
        } catch (retryError) {
          const context = {
            apiName,
            uniqueField,
            uniqueValue,
            payloadPreview: JSON.stringify(sanitizedPayload, null, 2).slice(0, 3000),
          };
          const wrappedError = new Error(
            `Create failed for ${apiName} (${uniqueField}=${uniqueValue}): ${retryError.message}\nContext: ${JSON.stringify(context, null, 2)}`
          );
          wrappedError.cause = retryError;
          throw wrappedError;
        }
      } else {
        const context = {
          apiName,
          uniqueField,
          uniqueValue,
          payloadPreview: JSON.stringify(payload, null, 2).slice(0, 3000),
        };
        const wrappedError = new Error(
          `Create failed for ${apiName} (${uniqueField}=${uniqueValue}): ${error.message}\nContext: ${JSON.stringify(context, null, 2)}`
        );
        wrappedError.cause = error;
        throw wrappedError;
      }
    } else {
      const context = {
        apiName,
        uniqueField,
        uniqueValue,
        payloadPreview: JSON.stringify(payload, null, 2).slice(0, 3000),
      };
      const wrappedError = new Error(
        `Create failed for ${apiName} (${uniqueField}=${uniqueValue}): ${error.message}\nContext: ${JSON.stringify(context, null, 2)}`
      );
      wrappedError.cause = error;
      throw wrappedError;
    }
  }
  stats[statsKey].created += 1;
  console.log(`Created ${apiName}: ${uniqueValue}`);
  return created.data;
}

async function updateDocument(apiName, documentId, payload, statsKey, uniqueValue) {
  if (!documentId) {
    throw new Error(`Cannot update ${apiName} without documentId`);
  }

  if (DRY_RUN) {
    if (stats[statsKey]?.updated !== undefined) {
      stats[statsKey].updated += 1;
    }
    console.log(
      `[DRY_RUN] update ${apiName}:`,
      JSON.stringify({ documentId, uniqueValue, payload }, null, 2).slice(0, 4000)
    );
    return { documentId, ...payload.data };
  }

  let updated;
  try {
    updated = await strapiRequest('put', `${getCollectionPath(apiName)}/${documentId}`, { data: payload });
  } catch (error) {
    const invalidKeys = extractInvalidPayloadKeys(error);
    if (invalidKeys.length > 0) {
      const sanitizedPayload = stripUnsupportedPayloadFields(payload, invalidKeys);
      if (sanitizedPayload && JSON.stringify(sanitizedPayload) !== JSON.stringify(payload)) {
        console.warn(`Retrying update for ${apiName} after removing unsupported fields: ${invalidKeys.join(', ')}`);
        try {
          updated = await strapiRequest('put', `${getCollectionPath(apiName)}/${documentId}`, { data: sanitizedPayload });
        } catch (retryError) {
          const context = {
            apiName,
            documentId,
            uniqueValue,
            payloadPreview: JSON.stringify(sanitizedPayload, null, 2).slice(0, 3000),
          };
          const wrappedError = new Error(
            `Update failed for ${apiName} (${uniqueValue}): ${retryError.message}\nContext: ${JSON.stringify(context, null, 2)}`
          );
          wrappedError.cause = retryError;
          throw wrappedError;
        }
      } else {
        const context = {
          apiName,
          documentId,
          uniqueValue,
          payloadPreview: JSON.stringify(payload, null, 2).slice(0, 3000),
        };
        const wrappedError = new Error(
          `Update failed for ${apiName} (${uniqueValue}): ${error.message}\nContext: ${JSON.stringify(context, null, 2)}`
        );
        wrappedError.cause = error;
        throw wrappedError;
      }
    } else {
      const context = {
        apiName,
        documentId,
        uniqueValue,
        payloadPreview: JSON.stringify(payload, null, 2).slice(0, 3000),
      };
      const wrappedError = new Error(
        `Update failed for ${apiName} (${uniqueValue}): ${error.message}\nContext: ${JSON.stringify(context, null, 2)}`
      );
      wrappedError.cause = error;
      throw wrappedError;
    }
  }

  if (stats[statsKey]?.updated !== undefined) {
    stats[statsKey].updated += 1;
  }
  console.log(`Updated ${apiName}: ${uniqueValue}`);
  return updated.data;
}

function getUrlFilename(fileUrl) {
  const normalizedUrl = normalizeRemoteUrl(fileUrl);
  if (!normalizedUrl) {
    return '';
  }

  try {
    return path.basename(new URL(normalizedUrl).pathname || '');
  } catch {
    return path.basename(normalizedUrl);
  }
}

function getPreferredUploadFilename(fileUrl, fallbackName) {
  const urlFilename = getUrlFilename(fileUrl);
  if (urlFilename) {
    return urlFilename;
  }

  return fallbackName || 'wordpress-file';
}

async function uploadFileToStrapi(fileUrl, filename, mimeType) {
  if (!MIGRATE_MEDIA || !fileUrl) {
    stats.media.skipped += 1;
    return null;
  }

  const normalizedUrl = normalizeRemoteUrl(fileUrl);
  if (!normalizedUrl) {
    stats.media.skipped += 1;
    return null;
  }

  const preferredFilename = getPreferredUploadFilename(normalizedUrl, filename);
  const cacheKey = `${normalizedUrl}::${preferredFilename}::${mimeType || ''}`;
  if (uploadCache.has(cacheKey)) {
    stats.media.skipped += 1;
    return uploadCache.get(cacheKey);
  }

  if (DRY_RUN) {
    const dryRunFile = { id: null, documentId: `dry-run-upload-${slug(preferredFilename || 'file')}` };
    uploadCache.set(cacheKey, dryRunFile);
    stats.media.uploaded += 1;
    console.log(`[DRY_RUN] upload media: ${normalizedUrl}`);
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
        maxBodyLength: Infinity,
        maxRedirects: 5,
        headers: {
          Accept: '*/*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          ...(WP_BASE_URL ? { Referer: WP_BASE_URL } : {}),
        },
      });
      const form = new FormData();
      form.append('files', Buffer.from(fileResponse.data), {
        filename: preferredFilename,
        contentType: mimeType || fileResponse.headers['content-type'] || undefined,
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
      if (attempt <= MEDIA_DOWNLOAD_RETRIES && isRetryableError(error)) {
        console.warn(
          `Retrying media upload (${attempt}/${MEDIA_DOWNLOAD_RETRIES + 1}) for "${normalizedUrl}": ${summarizeError(error)}`
        );
        await sleep(750 * attempt);
        continue;
      }

      stats.media.failed += 1;
      console.warn(`Failed to upload media "${normalizedUrl}": ${summarizeError(error)}`);
      return null;
    }
  }
}

function normalizeRemoteUrl(value) {
  if (!isMeaningfulValue(value)) {
    return '';
  }

  let normalized = String(value).trim();
  normalized = normalized
    .replace(/^[\s`"'“”‘’]+/, '')
    .replace(/[\s`"'“”‘’]+$/, '')
    .trim();
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

function looksLikeMediaUrl(url) {
  const normalized = String(url || '');
  if (!normalized) {
    return false;
  }

  if (/\/wp-content\/uploads\//i.test(normalized)) {
    return true;
  }

  return /\.(avif|bmp|gif|jpe?g|png|webp|svg|pdf|mp4|mov|m4v|mp3|wav|ogg|webm|zip|docx?|pptx?|xlsx?)($|\?)/i.test(
    normalized
  );
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

function getStrapiAssetUrl(uploaded) {
  const url = uploaded?.url;
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return url.startsWith('/') ? url : `/${url}`;
}

function stripResponsiveImgAttributes(html) {
  return String(html || '')
    .replace(/\s+srcset=(["']).*?\1/gi, '')
    .replace(/\s+sizes=(["']).*?\1/gi, '');
}

async function migrateHtmlMedia(html, baseUrl) {
  if (!MIGRATE_MEDIA) {
    return html || '';
  }

  const input = String(html || '');
  if (!input.trim()) {
    return input;
  }

  const normalizedStrapiUrl = normalizeRemoteUrl(STRAPI_URL);
  const rawUrls = new Set();

  const attrRegex = /\b(?:src|href)=["']([^"']+)["']/gi;
  let match = attrRegex.exec(input);
  while (match) {
    rawUrls.add(match[1]);
    match = attrRegex.exec(input);
  }

  const cssRegex = /url\(([^)]+)\)/gi;
  match = cssRegex.exec(input);
  while (match) {
    rawUrls.add(match[1]);
    match = cssRegex.exec(input);
  }

  const resolvedMap = new Map();
  const uploadTargets = [];

  for (const rawUrl of rawUrls) {
    const cleaned = normalizeRemoteUrl(rawUrl).replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if (!looksLikeMediaUrl(cleaned)) {
      continue;
    }

    if (normalizedStrapiUrl && cleaned.startsWith(normalizedStrapiUrl)) {
      continue;
    }

    if (/^\/uploads\//i.test(cleaned)) {
      continue;
    }

    const resolved = resolveRemoteUrl(cleaned, baseUrl);
    if (!resolved) {
      continue;
    }

    resolvedMap.set(rawUrl, resolved);
    uploadTargets.push(resolved);
  }

  const uniqueTargets = [...new Set(uploadTargets)];
  const uploadedByResolved = new Map();

  for (const target of uniqueTargets) {
    const fileName = (() => {
      try {
        const url = new URL(target);
        const baseName = path.basename(url.pathname);
        return baseName || undefined;
      } catch {
        return undefined;
      }
    })();

    const uploaded = await uploadFileToStrapi(target, fileName);
    const strapiUrl = uploaded ? getStrapiAssetUrl(uploaded) : null;
    if (strapiUrl) {
      uploadedByResolved.set(target, strapiUrl);
    }
  }

  const replaceAttrRegex = /\b(src|href)=["']([^"']+)["']/gi;
  let output = input.replace(replaceAttrRegex, (full, attr, value) => {
    const resolved = resolvedMap.get(value);
    if (!resolved) {
      return full;
    }

    const replacement = uploadedByResolved.get(resolved);
    if (!replacement) {
      return full;
    }

    return `${attr}="${replacement}"`;
  });

  const replaceCssRegex = /url\(([^)]+)\)/gi;
  output = output.replace(replaceCssRegex, (full, value) => {
    const cleaned = normalizeRemoteUrl(value).replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    const resolved = resolvedMap.get(value) || resolveRemoteUrl(cleaned, baseUrl);
    if (!resolved) {
      return full;
    }

    const replacement = uploadedByResolved.get(resolved);
    if (!replacement) {
      return full;
    }

    return `url("${replacement}")`;
  });

  return stripResponsiveImgAttributes(output);
}

async function getPostMeta(conn, postId) {
  const [metaRows] = await conn.query(
    `SELECT meta_key, meta_value FROM ${table('postmeta')} WHERE post_id = ?`,
    [postId]
  );

  const acf = {};
  let thumbnailId = null;

  for (const meta of metaRows) {
    if (!meta.meta_key) {
      continue;
    }

    if (meta.meta_key === '_thumbnail_id') {
      thumbnailId = meta.meta_value ? Number(meta.meta_value) : null;
      continue;
    }

    if (meta.meta_key.startsWith('_')) {
      continue;
    }

    acf[meta.meta_key] = normalizeMetaValue(meta.meta_value);
  }

  return {
    acf,
    seo: extractSeo(metaRows),
    thumbnailId,
    rawMetaCount: metaRows.length,
  };
}

async function getTaxonomyTermIds(conn, objectId, taxonomy) {
  const [rows] = await conn.query(
    `
      SELECT tt.term_id
      FROM ${table('term_relationships')} AS tr
      JOIN ${table('term_taxonomy')} AS tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      WHERE tr.object_id = ? AND tt.taxonomy = ?
    `,
    [objectId, taxonomy]
  );

  return rows.map((row) => row.term_id);
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
    attachment.post_name || attachment.post_title || `attachment-${attachment.ID}`,
    attachment.post_mime_type
  );
}

function buildAcfPayload(wordPressPost, metaResult, extra = {}) {
  const payload = {
    ...metaResult.acf,
    _migration: {
      wpId: wordPressPost.ID,
      postType: wordPressPost.post_type,
      postStatus: wordPressPost.post_status,
      postDate: wordPressPost.post_date,
      modifiedDate: wordPressPost.post_modified,
      guid: wordPressPost.guid,
      rawMetaCount: metaResult.rawMetaCount,
      ...extra,
    },
  };

  if (!payload._migration.excerpt && wordPressPost.post_excerpt) {
    payload._migration.excerpt = wordPressPost.post_excerpt;
  }

  if (!payload._migration.content && wordPressPost.post_content) {
    payload._migration.content = wordPressPost.post_content;
  }

  return payload;
}

function extractLayoutTypes(acf = {}, allowedTypes = null) {
  const layoutTypes = new Set();
  const allowedSet = Array.isArray(allowedTypes) && allowedTypes.length > 0
    ? new Set(allowedTypes)
    : null;

  for (const [key, value] of Object.entries(acf)) {
    if (!/^layouts_\d+_layout_type$/.test(key)) {
      continue;
    }

    const normalized = String(value || '').trim();
    if (normalized && (!allowedSet || allowedSet.has(normalized))) {
      layoutTypes.add(normalized);
    }
  }

  return Array.from(layoutTypes);
}

function normalizeLayoutKey(key) {
  return String(key || '')
    .replace(/__+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
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

function firstMeaningful(...values) {
  return values.find(isMeaningfulValue);
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

async function buildPagePayload(wordPressPage, metaResult, conn) {
  const data = {
    title: wordPressPage.post_title || `Page ${wordPressPage.ID}`,
    slug: wordPressPage.post_name || slug(wordPressPage.post_title, `page-${wordPressPage.ID}`),
  };

  if (hasAttribute('page', 'content')) {
    data.content = await migrateHtmlMedia(wordPressPage.post_content || '', wordPressPage.guid || '');
  }

  if (hasAttribute('page', 'seo') && (metaResult.seo.title || metaResult.seo.description)) {
    data.seo = pickDefined({
      metaTitle: metaResult.seo.title,
      metaDescription: metaResult.seo.description,
    });
  }

  if (hasAttribute('page', 'acf')) {
    data.acf = buildAcfPayload(wordPressPage, metaResult, {
      kind: 'page',
    });
  }

  if (hasAttribute('page', 'pageBuilder')) {
    const pageBuilder = await buildPageBuilder(metaResult.acf, conn);
    if (pageBuilder.length > 0) {
      data.pageBuilder = pageBuilder;
    }
  }

  return { data: pickDefined(data) };
}

async function buildPostPayload(wordPressPost, metaResult, relatedEntries, featuredImage) {
  const data = {
    title: wordPressPost.post_title || `Post ${wordPressPost.ID}`,
    slug: wordPressPost.post_name || slug(wordPressPost.post_title, `post-${wordPressPost.ID}`),
  };

  if (hasAttribute('post', 'excerpt')) {
    data.excerpt = wordPressPost.post_excerpt || '';
  }

  if (hasAttribute('post', 'content')) {
    data.content = await migrateHtmlMedia(wordPressPost.post_content || '', wordPressPost.guid || '');
  }

  if (hasAttribute('post', 'layout')) {
    const layoutTypes = extractLayoutTypes(metaResult.acf, ['faq_section_block']);
    if (layoutTypes.length > 0) {
      data.layout = layoutTypes.join(', ');
    }
  }

  if (hasAttribute('post', 'seo') && (metaResult.seo.title || metaResult.seo.description)) {
    data.seo = pickDefined({
      metaTitle: metaResult.seo.title,
      metaDescription: metaResult.seo.description,
    });
  }

  if (hasAttribute('post', 'seo') && (metaResult.seo.title || metaResult.seo.description)) {
    data.seo = pickDefined({
      metaTitle: metaResult.seo.title,
      metaDescription: metaResult.seo.description,
    });
  }

  if (hasAttribute('post', 'acf')) {
    data.acf = buildAcfPayload(wordPressPost, metaResult, {
      kind: 'post',
      categoryTermIds: relatedEntries.categoryTermIds,
      tagTermIds: relatedEntries.tagTermIds,
      authorId: wordPressPost.post_author,
    });
  }

  if (featuredImage && hasAttribute('post', 'featuredImage')) {
    data.featuredImage = getMediaReference(featuredImage);
  }

  if (relatedEntries.author && hasAttribute('post', 'author')) {
    data.author = getEntryReference(relatedEntries.author);
  }

  if (relatedEntries.categories.length > 0 && hasAttribute('post', 'categories')) {
    data.categories = relatedEntries.categories.map(getEntryReference).filter(Boolean);
  }

  if (relatedEntries.tags.length > 0 && hasAttribute('post', 'tags')) {
    data.tags = relatedEntries.tags.map(getEntryReference).filter(Boolean);
  }

  return { data: pickDefined(data) };
}

async function importCategories(conn) {
  if (!MIGRATE_TYPES.includes('categories')) {
    return {};
  }

  const [rows] = await conn.query(
    `
      SELECT t.term_id, t.name, t.slug
      FROM ${table('terms')} AS t
      JOIN ${table('term_taxonomy')} AS tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'category'
      ORDER BY t.term_id ASC
    `
  );

  const map = {};

  for (const row of rows) {
    const payload = {
      data: pickDefined({
        name: row.name,
        slug: row.slug || slug(row.name, `category-${row.term_id}`),
      }),
    };

    map[row.term_id] = await createIfMissing(
      'category',
      hasAttribute('category', 'slug') ? 'slug' : 'name',
      payload.data.slug || payload.data.name,
      payload,
      'categories'
    );
  }

  return map;
}

async function importTags(conn) {
  if (!MIGRATE_TYPES.includes('tags')) {
    return {};
  }

  const [rows] = await conn.query(
    `
      SELECT t.term_id, t.name, t.slug
      FROM ${table('terms')} AS t
      JOIN ${table('term_taxonomy')} AS tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'post_tag'
      ORDER BY t.term_id ASC
    `
  );

  const map = {};

  for (const row of rows) {
    const payload = {
      data: pickDefined({
        name: row.name,
        slug: row.slug || slug(row.name, `tag-${row.term_id}`),
      }),
    };

    map[row.term_id] = await createIfMissing(
      'tag',
      hasAttribute('tag', 'slug') ? 'slug' : 'name',
      payload.data.slug || payload.data.name,
      payload,
      'tags'
    );
  }

  return map;
}

async function importAuthors(conn) {
  if (!MIGRATE_TYPES.includes('authors')) {
    return {};
  }

  const [rows] = await conn.query(
    `
      SELECT ID, display_name, user_email
      FROM ${table('users')}
      ORDER BY ID ASC
    `
  );

  const map = {};

  for (const row of rows) {
    const payload = {
      data: pickDefined({
        name: row.display_name || `Author ${row.ID}`,
        email: row.user_email || undefined,
      }),
    };

    const uniqueField = row.user_email ? 'email' : 'name';
    const uniqueValue = row.user_email || payload.data.name;
    map[row.ID] = await createIfMissing('author', uniqueField, uniqueValue, payload, 'authors');
  }

  return map;
}

async function getNavMenus(conn) {
  const params = [];
  const whereClauses = [`tt.taxonomy = 'nav_menu'`];

  if (WP_MENU_IDS.length > 0) {
    whereClauses.push(`t.term_id IN (${WP_MENU_IDS.map(() => '?').join(', ')})`);
    params.push(...WP_MENU_IDS);
  }

  const [rows] = await conn.query(
    `
      SELECT t.term_id, t.name, t.slug, tt.term_taxonomy_id
      FROM ${table('terms')} AS t
      JOIN ${table('term_taxonomy')} AS tt ON t.term_id = tt.term_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY t.term_id ASC
    `,
    params
  );

  return rows;
}

async function getMenuItemMeta(conn, postId) {
  const [metaRows] = await conn.query(
    `SELECT meta_key, meta_value FROM ${table('postmeta')} WHERE post_id = ?`,
    [postId]
  );

  const meta = Object.fromEntries(
    metaRows.filter((row) => row.meta_key).map((row) => [row.meta_key, row.meta_value])
  );

  return {
    type: String(meta._menu_item_type || ''),
    object: String(meta._menu_item_object || ''),
    objectId: meta._menu_item_object_id ? Number(meta._menu_item_object_id) : null,
    url: normalizeRemoteUrl(meta._menu_item_url),
    title: String(meta._menu_item_title || '').trim(),
    parentId: meta._menu_item_menu_item_parent ? Number(meta._menu_item_menu_item_parent) : 0,
    targetBlank: String(meta._menu_item_target || '') === '_blank',
  };
}

function stripBaseUrl(url, baseUrl) {
  const normalizedUrl = normalizeRemoteUrl(url);
  const normalizedBase = normalizeRemoteUrl(baseUrl);
  if (!normalizedUrl || !normalizedBase) {
    return normalizedUrl;
  }

  try {
    const base = new URL(normalizedBase);
    const parsed = new URL(normalizedUrl);
    if (base.host !== parsed.host) {
      return normalizedUrl;
    }

    const path = `${parsed.pathname || ''}${parsed.search || ''}${parsed.hash || ''}`;
    return path.startsWith('/') ? path : `/${path}`;
  } catch {
    return normalizedUrl;
  }
}

async function getPostPermalinkInfo(conn, postId) {
  const normalizedId = Number(postId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return null;
  }

  const [rows] = await conn.query(
    `
      SELECT ID, post_name, post_type, guid
      FROM ${table('posts')}
      WHERE ID = ?
    `,
    [normalizedId]
  );

  return rows[0] || null;
}

function buildInternalMenuUrl({ postType, postSlug, guid }) {
  const normalizedGuid = normalizeRemoteUrl(guid);
  if (normalizedGuid && WP_BASE_URL) {
    const stripped = stripBaseUrl(normalizedGuid, WP_BASE_URL);
    if (stripped && stripped.startsWith('/')) {
      return stripped;
    }
  }

  const normalizedSlug = String(postSlug || '').trim();
  if (!normalizedSlug) {
    return '/';
  }

  if (String(postType || '').toLowerCase() === 'post') {
    return `/blog/${normalizedSlug}`;
  }

  return `/${normalizedSlug}`;
}

async function importMenus(conn) {
  if (!MIGRATE_TYPES.includes('menus')) {
    return;
  }

  const menus = await getNavMenus(conn);
  if (menus.length === 0) {
    console.log('No WordPress nav menus found');
    return;
  }

  const wpPostCache = new Map();

  for (const menu of menus) {
    const [itemRows] = await conn.query(
      `
        SELECT p.ID, p.post_title, p.menu_order
        FROM ${table('posts')} AS p
        JOIN ${table('term_relationships')} AS tr ON p.ID = tr.object_id
        WHERE tr.term_taxonomy_id = ?
          AND p.post_type = 'nav_menu_item'
        ORDER BY p.menu_order ASC, p.ID ASC
      `,
      [menu.term_taxonomy_id]
    );

    const itemsById = new Map();
    const itemOrder = [];

    for (const row of itemRows) {
      const meta = await getMenuItemMeta(conn, row.ID);
      let label = String(meta.title || row.post_title || '').trim();
      let url = meta.url;

      if (meta.type === 'post_type' && meta.objectId) {
        let wpPost = wpPostCache.get(meta.objectId);
        if (!wpPost) {
          wpPost = await getPostPermalinkInfo(conn, meta.objectId);
          wpPostCache.set(meta.objectId, wpPost);
        }

        if (wpPost) {
          if (!label) {
            label = String(wpPost.post_title || '').trim();
          }
          url = buildInternalMenuUrl({
            postType: wpPost.post_type,
            postSlug: wpPost.post_name,
            guid: wpPost.guid,
          });
        }
      }

      if (WP_BASE_URL && /^https?:\/\//i.test(url)) {
        url = stripBaseUrl(url, WP_BASE_URL);
      }

      itemsById.set(row.ID, {
        id: row.ID,
        label: label || `Menu Item ${row.ID}`,
        url: url || '/',
        targetBlank: meta.targetBlank,
        order: Number(row.menu_order) || 0,
        parentId: Number(meta.parentId) || 0,
      });
      itemOrder.push(row.ID);
    }

    const childBuckets = new Map();
    const rootIds = [];

    function getItem(id) {
      return itemsById.get(id) || null;
    }

    function getRootId(item) {
      let current = item;
      const visited = new Set();

      while (current && current.parentId > 0) {
        if (visited.has(current.id)) {
          break;
        }
        visited.add(current.id);

        const parent = getItem(current.parentId);
        if (!parent) {
          break;
        }

        current = parent;
      }

      return current?.id || item.id;
    }

    for (const id of itemOrder) {
      const item = getItem(id);
      if (!item) {
        continue;
      }

      if (item.parentId <= 0) {
        rootIds.push(item.id);
        continue;
      }

      const rootId = getRootId(item);
      if (rootId === item.id) {
        rootIds.push(item.id);
        continue;
      }

      const bucket = childBuckets.get(rootId) || [];
      bucket.push(item);
      childBuckets.set(rootId, bucket);
    }

    const uniqueRootIds = Array.from(new Set(rootIds));
    const nodes = uniqueRootIds
      .map((rootId) => itemsById.get(rootId))
      .filter(Boolean)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((root) => {
        const children = (childBuckets.get(root.id) || [])
          .slice()
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((child) => ({
            label: child.label,
            url: child.url,
            targetBlank: child.targetBlank,
          }));

        return {
          order: root.order,
          item: {
            label: root.label,
            url: root.url,
            targetBlank: root.targetBlank,
          },
          children,
        };
      });

    const payload = {
      data: pickDefined({
        title: menu.name || `Menu ${menu.term_id}`,
        slug: slug(menu.slug || menu.name || `menu-${menu.term_id}`),
        wpTermId: Number(menu.term_id) || undefined,
        items: nodes,
      }),
    };

    await createIfMissing(
      'menu',
      hasAttribute('menu', 'wpTermId') ? 'wpTermId' : 'slug',
      hasAttribute('menu', 'wpTermId') ? payload.data.wpTermId : payload.data.slug,
      payload,
      'menus'
    );
  }
}

async function importPages(conn) {
  if (!MIGRATE_TYPES.includes('pages')) {
    return;
  }

  const whereClauses = [`post_type = ?`];
  const params = [PAGE_POST_TYPE];

  if (PUBLISHED_ONLY) {
    whereClauses.push(`post_status = 'publish'`);
  }

  let query = `
    SELECT ID, post_title, post_name, post_content, post_excerpt, post_status, post_type,
           post_date, post_modified, guid
    FROM ${table('posts')}
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY ID ASC
  `;

  if (POST_LIMIT > 0) {
    query += ` LIMIT ${POST_LIMIT}`;
  }

  const [rows] = await conn.query(query, params);

  for (const row of rows) {
    const metaResult = await getPostMeta(conn, row.ID);
    const payload = await buildPagePayload(row, metaResult, conn);
    const existing = await getExistingByField('page', 'slug', payload.data.slug);

    if (existing) {
      if (Array.isArray(payload.data.pageBuilder) && payload.data.pageBuilder.length > 0) {
        await updateDocument('page', existing.documentId || existing.id, payload, 'pages', payload.data.slug);
      } else {
        stats.pages.skipped += 1;
        console.log(`Skipped existing page: ${payload.data.slug}`);
      }
      continue;
    }

    await createIfMissing('page', 'slug', payload.data.slug, payload, 'pages');
  }
}

async function importPosts(conn, categoryMap, tagMap, authorMap) {
  if (!MIGRATE_TYPES.includes('posts')) {
    return;
  }

  const whereClauses = [`post_type = ?`];
  const params = [BLOG_POST_TYPE];

  if (PUBLISHED_ONLY) {
    whereClauses.push(`post_status = 'publish'`);
  }

  let query = `
    SELECT ID, post_title, post_name, post_excerpt, post_content, post_author, post_status,
           post_type, post_date, post_modified, guid
    FROM ${table('posts')}
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY ID ASC
  `;

  if (POST_LIMIT > 0) {
    query += ` LIMIT ${POST_LIMIT}`;
  }

  const [rows] = await conn.query(query, params);

  for (const row of rows) {
    const metaResult = await getPostMeta(conn, row.ID);
    const categoryTermIds = await getTaxonomyTermIds(conn, row.ID, 'category');
    const tagTermIds = await getTaxonomyTermIds(conn, row.ID, 'post_tag');

    let featuredImage = null;
    if (metaResult.thumbnailId) {
      const attachment = await getAttachment(conn, metaResult.thumbnailId);
      if (attachment?.guid) {
        const uploaded = await uploadFileToStrapi(
          attachment.guid,
          attachment.post_name || attachment.post_title || `attachment-${attachment.ID}`,
          attachment.post_mime_type
        );
        featuredImage = uploaded;
      }
    }

    const payload = await buildPostPayload(
      row,
      metaResult,
      {
        author: authorMap[row.post_author] || null,
        categories: categoryTermIds.map((id) => categoryMap[id]).filter(Boolean),
        tags: tagTermIds.map((id) => tagMap[id]).filter(Boolean),
        categoryTermIds,
        tagTermIds,
      },
      featuredImage
    );

    // If an entry already exists, by default skip it (create-only).
    // To enable updating fields on existing posts set env vars:
    //   UPDATE_EXISTING_FEATURED_IMAGE=true  -> update featuredImage
    //   UPDATE_EXISTING_CONTENT=true         -> update content
    const existing = await getExistingByField('post', 'slug', payload.data.slug);
    if (existing) {
      const shouldUpdateExistingFeatured = String(process.env.UPDATE_EXISTING_FEATURED_IMAGE || '').toLowerCase() === 'true';
      const shouldUpdateExistingContent = String(process.env.UPDATE_EXISTING_CONTENT || '').toLowerCase() === 'true';

      const updateData = {};
      if (shouldUpdateExistingFeatured && payload.data.featuredImage !== undefined) {
        updateData.featuredImage = payload.data.featuredImage;
      }

      if (shouldUpdateExistingContent && payload.data.content !== undefined) {
        updateData.content = payload.data.content;
      }

      if (Object.keys(updateData).length > 0) {
        try {
          await updateDocument(
            'post',
            existing.documentId || existing.id,
            { data: updateData },
            'posts',
            payload.data.slug
          );
        } catch (err) {
          console.warn(`Failed to update existing post ${payload.data.slug}: ${err.message || err}`);
        }
      } else {
        stats.posts.skipped += 1;
        console.log(`Skipped existing post: ${payload.data.slug}`);
      }

      continue;
    }

    await createIfMissing('post', 'slug', payload.data.slug, payload, 'posts');
  }
}

function validateConfig() {
  const missing = [];

  if (!WP_DB.user) {
    missing.push('WP_DB_USER');
  }

  if (!WP_DB.database) {
    missing.push('WP_DB_NAME');
  }

  if (!DRY_RUN && !STRAPI_TOKEN) {
    missing.push('STRAPI_API_TOKEN');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function main() {
  validateConfig();

  console.log(
    JSON.stringify(
      {
        mode: DRY_RUN ? 'dry-run' : 'write',
        strapiUrl: STRAPI_URL,
        migrateTypes: MIGRATE_TYPES,
        pagePostType: PAGE_POST_TYPE,
        blogPostType: BLOG_POST_TYPE,
        publishedOnly: PUBLISHED_ONLY,
        migrateMedia: MIGRATE_MEDIA,
        tablePrefix: TABLE_PREFIX,
        skipExisting: SKIP_EXISTING,
        postLimit: POST_LIMIT || null,
        wpMenuIds: WP_MENU_IDS.length > 0 ? WP_MENU_IDS : null,
      },
      null,
      2
    )
  );

  const conn = createWordPressClient(WP_DB);

  try {
    console.log('Connected to WordPress DB');

    const categoryMap = await importCategories(conn);
    const tagMap = await importTags(conn);
    const authorMap = await importAuthors(conn);
    await importMenus(conn);

    await importPages(conn);
    await importPosts(conn, categoryMap, tagMap, authorMap);

    console.log('Migration summary:');
    console.log(JSON.stringify(stats, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.message || error);
  process.exit(1);
});

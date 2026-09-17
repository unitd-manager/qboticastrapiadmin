#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { buildPageBuilder } = require('./lib/acf-page-builder-mapper');
const axios = require('axios');
const FormData = require('form-data');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const WP_PAGE_IDS = [60, 2071, 6521, 6837, 7163, 7417];
const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:3123';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
const MIGRATE_MEDIA = toBoolean(process.env.MIGRATE_MEDIA, true);
const MEDIA_DOWNLOAD_TIMEOUT_MS = toPositiveNumber(process.env.MEDIA_DOWNLOAD_TIMEOUT_MS, 30000);
const MEDIA_DOWNLOAD_RETRIES = toPositiveNumber(process.env.MEDIA_DOWNLOAD_RETRIES, 2);
const MEDIA_DOWNLOAD_DELAY_MS = toPositiveNumber(process.env.MEDIA_DOWNLOAD_DELAY_MS, 150);
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
  media: { uploaded: 0, skipped: 0, failed: 0 },
  pages: { processed: 0, updated: 0 }
};

function toBoolean(value, fallback) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sepIdx = trimmed.indexOf('=');
    if (sepIdx === -1) continue;
    const key = trimmed.slice(0, sepIdx).trim();
    const value = trimmed.slice(sepIdx + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)"$/, '$1');
    if (!key || process.env[key]) continue;
    process.env[key] = value;
  }
}

function table(name) {
  return `${TABLE_PREFIX}${name}`;
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function normalizeRemoteUrl(value) {
  if (!isMeaningfulValue(value)) return '';
  let normalized = String(value).trim();
  normalized = normalized.replace(/^[\s`"'“”‘’]+/, '').replace(/[\s`"'“”‘’]+$/, '').trim();
  return normalized;
}

function isRetryableError(error) {
  const status = error?.response?.status;
  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  const code = String(error?.code || '').toUpperCase();
  return ['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ERR_BAD_RESPONSE'].includes(code) ||
    /socket hang up|timeout|network error/i.test(String(error?.message || ''));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMediaReference(entry) {
  return entry?.id || entry?.documentId || entry || null;
}

async function uploadFileToStrapi(fileUrl, filename, conn) {
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

  // Check if already in Strapi DB
  const [existing] = await conn.query(`SELECT id, documentId, url FROM files WHERE url LIKE ? OR name = ? LIMIT 1`, 
    [`%${path.basename(normalizedUrl)}%`, filename || path.basename(new URL(normalizedUrl).pathname)]);
  if (existing.length > 0) {
    console.log(`  Media already exists in DB: ${existing[0].url}`);
    uploadCache.set(cacheKey, existing[0]);
    stats.media.skipped += 1;
    return existing[0];
  }

  // Try to upload via API, but if fails, just skip
  try {
    for (let attempt = 1; attempt <= MEDIA_DOWNLOAD_RETRIES + 1; attempt += 1) {
      try {
        if (MEDIA_DOWNLOAD_DELAY_MS > 0) await sleep(MEDIA_DOWNLOAD_DELAY_MS);
        const fileResponse = await axios.get(normalizedUrl, {
          responseType: 'arraybuffer',
          timeout: MEDIA_DOWNLOAD_TIMEOUT_MS,
          maxRedirects: 5,
          headers: {
            Accept: '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const form = new FormData();
        form.append('files', Buffer.from(fileResponse.data), {
          filename: filename || path.basename(new URL(normalizedUrl).pathname)
        });

        const headers = { ...form.getHeaders() };
        if (STRAPI_TOKEN) headers.Authorization = `Bearer ${STRAPI_TOKEN}`;

        const uploadedRes = await axios.post(`${STRAPI_URL}/api/upload`, form, { headers });
        
        const firstFile = Array.isArray(uploadedRes.data) && uploadedRes.data.length > 0 ? uploadedRes.data[0] : null;
        if (firstFile) {
          uploadCache.set(cacheKey, firstFile);
          stats.media.uploaded += 1;
          return firstFile;
        }
      } catch (uploadErr) {
        if (attempt <= MEDIA_DOWNLOAD_RETRIES && isRetryableError(uploadErr)) {
          console.warn(`    Retrying upload (${attempt}/${MEDIA_DOWNLOAD_RETRIES+1})...`);
          await sleep(attempt * 1000);
          continue;
        }
        throw uploadErr;
      }
    }
  } catch (err) {
    stats.media.failed +=1;
    console.warn(`  Failed to upload ${normalizedUrl}:`, err?.message || err);
  }

  return null;
}

async function getAttachment(conn, attachmentId) {
  const normalizedId = Number(attachmentId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
  const [rows] = await conn.query(`SELECT ID, guid, post_title, post_name, post_mime_type FROM ${table('posts')} WHERE ID = ? AND post_type = 'attachment'`, [normalizedId]);
  return rows[0] || null;
}

async function uploadAttachmentIdToStrapi(conn, attachmentId, strapiConn) {
  const attachment = await getAttachment(conn, attachmentId);
  if (!attachment?.guid) return null;
  return uploadFileToStrapi(attachment.guid, attachment.post_name || attachment.post_title, strapiConn);
}

async function buildPageBuilderWithTools(acf, wpConn, strapiConn) {
  return buildPageBuilder(acf, {
    uploadAttachmentId: async (id) => uploadAttachmentIdToStrapi(wpConn, id, strapiConn),
    uploadRemoteUrl: async (url, filename) => uploadFileToStrapi(url, filename, strapiConn),
    getMediaReference
  });
}

async function main() {
  const wpConn = await mysql.createConnection(WP_DB);
  const strapiConn = await mysql.createConnection(WP_DB);

  try {
    for (const wpId of WP_PAGE_IDS) {
      console.log(`Processing WordPress page ${wpId}`);
      
      const [wpPosts] = await wpConn.query(`SELECT post_name FROM ${table('posts')} WHERE ID = ?`, [wpId]);
      if (wpPosts.length === 0) {
        console.log('  WordPress page not found');
        continue;
      }
      const wpSlug = wpPosts[0].post_name;
      
      const [strapiPages] = await strapiConn.query('SELECT id, acf FROM pages WHERE slug = ?', [wpSlug]);
      if (strapiPages.length === 0) {
        console.log('  Strapi page not found');
        continue;
      }
      const strapiPage = strapiPages[0];
      console.log(`  Found Strapi page ${strapiPage.id} (slug ${wpSlug})`);

      let acfData;
      if (strapiPage.acf) {
        if (typeof strapiPage.acf === 'string') {
          try {
            acfData = JSON.parse(strapiPage.acf);
          } catch {
            console.log('  Invalid ACF JSON, skipping');
            continue;
          }
        } else {
          acfData = strapiPage.acf;
        }
      }

      if (!acfData || typeof acfData !== 'object') {
        console.log('  No ACF data found');
        continue;
      }

      const pageBuilder = await buildPageBuilderWithTools(acfData, wpConn, strapiConn);
      console.log(`  Built ${pageBuilder.length} page builder components`);

      if (pageBuilder.length > 0) {
        await strapiConn.query('UPDATE pages SET page_builder = ? WHERE id = ?', [JSON.stringify(pageBuilder), strapiPage.id]);
        console.log('  Updated page_builder field');
        stats.pages.updated +=1;
      }
      stats.pages.processed +=1;
    }

    console.log('Stats:', JSON.stringify(stats, null, 2));
    console.log('Done!');

  } finally {
    await wpConn.end();
    await strapiConn.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

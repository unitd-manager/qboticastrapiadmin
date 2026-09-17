#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');
const FormData = require('form-data');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const STRAPI_URL = (process.env.STRAPI_URL || 'http://localhost:3123').replace(/\/$/, '');
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || process.env.STRAPI_TOKEN || '';
const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';
const EXECUTE = process.argv.includes('--execute');
const typeIndex = process.argv.indexOf('--type');
const requestedTypes = typeIndex >= 0 ? process.argv[typeIndex + 1] : 'page,post';
const contentTypes = requestedTypes.split(',').map((value) => value.trim()).filter(Boolean);
const limitIndex = process.argv.indexOf('--limit');
const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : 0;
const reportIndex = process.argv.indexOf('--report');
const reportPath = reportIndex >= 0 ? process.argv[reportIndex + 1] : 'tmp-migrate-images-report.json';
const requestTimeout = Number(process.env.MEDIA_DOWNLOAD_TIMEOUT_MS || 120000);
const uploadCache = new Map();

const wpDb = {
  host: process.env.WP_DB_HOST || process.env.DATABASE_HOST || '127.0.0.1',
  port: Number(process.env.WP_DB_PORT || process.env.DATABASE_PORT || 3306),
  user: process.env.WP_DB_USER || process.env.DATABASE_USERNAME || '',
  password: process.env.WP_DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
  database: process.env.WP_DB_NAME || process.env.DATABASE_NAME || '',
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    }
  }
}

function table(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(TABLE_PREFIX)) throw new Error(`Invalid WP_TABLE_PREFIX: ${TABLE_PREFIX}`);
  return `${TABLE_PREFIX}${name}`;
}

function isMediaKey(key) {
  return /(image|icon|logo|thumbnail|avatar|photo|picture|graphic|banner|background|certificate|award)/i.test(key);
}

function isMediaUrl(value) {
  return /^https?:\/\/[^\s"'<>]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?[^\s"'<>]*)?$/i.test(value);
}

function collectMediaValues(value, fieldName, sources) {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (isMediaKey(fieldName) && /^\d+$/.test(trimmed)) {
      sources.attachmentIds.add(Number(trimmed));
    } else if (isMediaUrl(trimmed)) {
      sources.urls.add(trimmed);
    }
    return;
  }
  if (typeof value === 'number' && Number.isInteger(value) && value > 0 && isMediaKey(fieldName)) {
    sources.attachmentIds.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectMediaValues(item, fieldName, sources));
    return;
  }
  if (typeof value === 'object') {
    for (const key of ['id', 'ID', 'attachment_id']) {
      const attachmentId = Number(value[key]);
      if (Number.isInteger(attachmentId) && attachmentId > 0) sources.attachmentIds.add(attachmentId);
    }
    for (const [key, item] of Object.entries(value)) {
      collectMediaValues(item, key || fieldName, sources);
    }
  }
}

function parseMetaValue(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {}
  }
  if (/^[abisdNO]:/.test(trimmed)) {
    const match = trimmed.match(/^i:(\d+);$/);
    if (match) return Number(match[1]);
  }
  return value;
}

function collectUrlsFromHtml(html, sources) {
  const matches = String(html || '').match(/https?:\/\/[^\s"'<>]+/gi) || [];
  for (const match of matches) {
    const cleaned = match.replace(/[),]+$/, '');
    if (isMediaUrl(cleaned)) sources.urls.add(cleaned);
  }
}

function attachmentFilename(attachment) {
  const fromUrl = attachment.guid ? path.basename(new URL(attachment.guid).pathname) : '';
  return fromUrl || attachment.post_name || attachment.post_title || `attachment-${attachment.ID}`;
}

async function uploadFile(source, filename, mimeType) {
  const cacheKey = `${source}::${filename}::${mimeType || ''}`;
  if (uploadCache.has(cacheKey)) return uploadCache.get(cacheKey);
  if (!EXECUTE) {
    const result = { source, filename, status: 'dry-run' };
    uploadCache.set(cacheKey, result);
    return result;
  }

  const fileResponse = await axios.get(source, {
    responseType: 'arraybuffer',
    timeout: requestTimeout,
    maxBodyLength: Infinity,
    maxRedirects: 5,
    headers: { Accept: 'image/*,*/*;q=0.8' },
  });
  const form = new FormData();
  form.append('files', Buffer.from(fileResponse.data), {
    filename,
    contentType: mimeType || fileResponse.headers['content-type']?.split(';')[0],
  });
  const response = await axios.post(`${STRAPI_URL}/api/upload`, form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${STRAPI_TOKEN}` },
    timeout: requestTimeout,
    maxBodyLength: Infinity,
  });
  const uploaded = Array.isArray(response.data) ? response.data[0] : response.data;
  const result = { source, filename, id: uploaded?.id, documentId: uploaded?.documentId, url: uploaded?.url, status: 'uploaded' };
  uploadCache.set(cacheKey, result);
  return result;
}

async function main() {
  if (EXECUTE && !STRAPI_TOKEN) throw new Error('STRAPI_API_TOKEN or STRAPI_TOKEN is required with --execute');
  if (!wpDb.database || !wpDb.user) throw new Error('WordPress database settings are missing');
  if (!contentTypes.every((type) => /^[a-zA-Z0-9_-]+$/.test(type))) throw new Error('Invalid --type value');

  const connection = await mysql.createConnection(wpDb);
  const report = { execute: EXECUTE, contentTypes, posts: [], failures: [] };
  try {
    const typePlaceholders = contentTypes.map(() => '?').join(', ');
    const limitSql = Number.isInteger(limit) && limit > 0 ? ` LIMIT ${limit}` : '';
    const [posts] = await connection.query(
      `SELECT ID, post_title, post_name, post_content, post_type, guid FROM ${table('posts')} WHERE post_type IN (${typePlaceholders}) AND post_status = 'publish' ORDER BY ID ASC${limitSql}`,
      contentTypes
    );

    for (const post of posts) {
      const sources = { attachmentIds: new Set(), urls: new Set() };
      collectUrlsFromHtml(post.post_content, sources);
      const [metaRows] = await connection.query(`SELECT meta_key, meta_value FROM ${table('postmeta')} WHERE post_id = ?`, [post.ID]);
      for (const meta of metaRows) {
        if (meta.meta_key === '_thumbnail_id') sources.attachmentIds.add(Number(meta.meta_value));
        if (!meta.meta_key?.startsWith('_')) collectMediaValues(parseMetaValue(meta.meta_value), meta.meta_key, sources);
      }

      const media = [];
      for (const attachmentId of sources.attachmentIds) {
        if (!Number.isFinite(attachmentId) || attachmentId <= 0) continue;
        const [attachments] = await connection.query(
          `SELECT ID, guid, post_title, post_name, post_mime_type FROM ${table('posts')} WHERE ID = ? AND post_type = 'attachment' LIMIT 1`,
          [attachmentId]
        );
        const attachment = attachments[0];
        if (!attachment?.guid) continue;
        try {
          media.push({ field: 'attachment', attachmentId, ...(await uploadFile(attachment.guid, attachmentFilename(attachment), attachment.post_mime_type)) });
        } catch (error) {
          report.failures.push({ wpPostId: post.ID, source: attachment.guid, error: error.message });
        }
      }
      for (const url of sources.urls) {
        try {
          media.push({ field: 'content-or-meta-url', ...(await uploadFile(url, path.basename(new URL(url).pathname), undefined)) });
        } catch (error) {
          report.failures.push({ wpPostId: post.ID, source: url, error: error.message });
        }
      }
      report.posts.push({ wpPostId: post.ID, postType: post.post_type, slug: post.post_name, title: post.post_title, media });
      console.log(`${post.post_type} ${post.ID}: ${media.length} media item(s)`);
    }
  } finally {
    await connection.end();
  }

  fs.writeFileSync(path.resolve(process.cwd(), reportPath), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Report written to ${reportPath}`);
  if (report.failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

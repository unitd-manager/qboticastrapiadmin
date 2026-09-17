#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:3123';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || process.env.STRAPI_TOKEN || '';
const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';
const PAGE_TYPE = process.env.WP_PAGE_TYPE || 'page';
const POST_TYPE = process.env.WP_POST_TYPE || 'post';
const CONTENT_TYPES = (process.env.WP_CONTENT_TYPES || 'page,post')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const EXECUTE = ['1', 'true', 'yes', 'on'].includes(String(process.env.EXECUTE || '').toLowerCase()) || process.argv.includes('--execute');
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 10);

const WP_DB = {
  host: (process.env.WP_DB_HOST || process.env.DATABASE_HOST || '127.0.0.1').trim(),
  port: Number(process.env.WP_DB_PORT || process.env.DATABASE_PORT || 3306),
  user: (process.env.WP_DB_USER || process.env.DATABASE_USERNAME || '').trim(),
  password: (process.env.WP_DB_PASSWORD || process.env.DATABASE_PASSWORD || '').trim(),
  database: (process.env.WP_DB_NAME || process.env.DATABASE_NAME || '').trim(),
};

// Auto-fallback to Strapi DB if WP_DB host is localhost
if (WP_DB.host === '127.0.0.1' || WP_DB.host === 'localhost') {
  WP_DB.host = (process.env.DATABASE_HOST || WP_DB.host).trim();
  WP_DB.port = Number(process.env.DATABASE_PORT || WP_DB.port);
  WP_DB.user = (process.env.DATABASE_USERNAME || process.env.DATABASE_USER || WP_DB.user).trim();
  WP_DB.password = (process.env.DATABASE_PASSWORD || WP_DB.password).trim();
  WP_DB.database = (process.env.DATABASE_NAME || WP_DB.database).trim();
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
}

function table(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(TABLE_PREFIX)) {
    throw new Error(`Invalid WP_TABLE_PREFIX: "${TABLE_PREFIX}"`);
  }
  return `${TABLE_PREFIX}${name}`;
}

function pickDefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function normalizeMetaValue(value) {
  if (value === null || value === undefined) return value;
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
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
    if (input[index] !== char) throw new Error(`Expected "${char}" at position ${index}`);
    index += 1;
  }
  function readUntil(char) {
    const endIndex = input.indexOf(char, index);
    if (endIndex === -1) throw new Error(`Could not find "${char}" after position ${index}`);
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
          if (!Number.isInteger(key) || key !== i) isSequentialArray = false;
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

function summarizeError(error) {
  if (axios.isAxiosError(error)) {
    return JSON.stringify({
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      code: error.code,
    });
  }
  return error?.message || String(error);
}

function buildUrl(apiPath, params = {}) {
  const url = new URL(apiPath, STRAPI_URL);
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
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
  const response = await axios({
    method,
    url: buildUrl(apiPath, params),
    data,
    headers: requestHeaders,
    timeout: timeoutMs || 90000,
  });
  return response.data;
}

function extractSeo(metaRows) {
  const metaByKey = Object.fromEntries(
    metaRows.filter((item) => item.meta_key).map((item) => [item.meta_key, normalizeMetaValue(item.meta_value)])
  );
  return {
    title:
      metaByKey._yoast_wpseo_title ||
      metaByKey.rank_math_title ||
      metaByKey.seo_title ||
      metaByKey.seoTitle ||
      metaByKey._aioseo_title ||
      metaByKey.yoast_title ||
      metaByKey.title,
    description:
      metaByKey._yoast_wpseo_metadesc ||
      metaByKey.rank_math_description ||
      metaByKey.seo_description ||
      metaByKey.seoDescription ||
      metaByKey._aioseo_description ||
      metaByKey.yoast_description ||
      metaByKey.description,
    canonicalUrl:
      metaByKey._yoast_wpseo_canonical ||
      metaByKey.rank_math_canonical_url ||
      metaByKey.rank_math_canonical ||
      metaByKey.canonicalUrl ||
      metaByKey.canonical_url ||
      metaByKey.canonical,
    keywords:
      metaByKey.rank_math_focus_keyword ||
      metaByKey.rank_math_keyword ||
      metaByKey.rank_math_keywords ||
      metaByKey.focus_keyword ||
      metaByKey.seo_keywords ||
      metaByKey.keywords ||
      metaByKey.meta_keywords,
  };
}

async function getWordPressEntryBySlug(conn, slug, postType) {
  const [rows] = await conn.query(
    `SELECT ID, post_title, post_name FROM ${table('posts')} WHERE post_type = ? AND post_name = ? LIMIT 1`,
    [postType, slug]
  );
  return rows[0] || null;
}

async function getPostMeta(conn, postId) {
  const [rows] = await conn.query(
    `SELECT meta_key, meta_value FROM ${table('postmeta')} WHERE post_id = ?`,
    [postId]
  );
  return rows;
}

async function getAllStrapiEntries(apiPath, pageSize = 100) {
  const allEntries = [];
  let currentPage = 1;
  let totalPages = 1;
  while (currentPage <= totalPages) {
    const response = await strapiRequest('get', apiPath, {
      params: {
        'pagination[page]': currentPage,
        'pagination[pageSize]': pageSize,
      },
    });
    const entries = Array.isArray(response?.data) ? response.data : [];
    allEntries.push(...entries);
    totalPages = response?.meta?.pagination?.pageCount || 1;
    currentPage += 1;
  }
  return allEntries;
}

async function updateStrapiEntrySeo(contentType, documentId, seo) {
  const payload = { data: { seo } };
  const endpoint = contentType === 'post' ? `/api/posts/${documentId}` : `/api/pages/${documentId}`;
  if (!EXECUTE) {
    console.log(`[DRY_RUN] Would update ${contentType} ${documentId} with SEO:`, JSON.stringify(seo, null, 2));
    return true;
  }
  try {
    await strapiRequest('put', endpoint, { data: payload });
    return true;
  } catch (error) {
    console.error(`Failed to update ${contentType} ${documentId}:`, summarizeError(error));
    return false;
  }
}

async function main() {
  if (!STRAPI_TOKEN && !EXECUTE) {
    throw new Error('Missing required environment variable: STRAPI_API_TOKEN');
  }
  if (!WP_DB.user) {
    throw new Error('Missing required WordPress DB credentials');
  }

  console.log(`Running SEO migration for Strapi content types: ${CONTENT_TYPES.join(', ')} (batch size: ${BATCH_SIZE})`);
  console.log(`Mode: ${EXECUTE ? 'WRITE' : 'DRY_RUN'}`);

  const conn = await mysql.createConnection(WP_DB);
  try {
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const contentType of CONTENT_TYPES) {
      const apiPath = contentType === 'post' ? '/api/posts' : '/api/pages';
      const wpPostType = contentType === 'post' ? POST_TYPE : PAGE_TYPE;
      const strapiEntries = await getAllStrapiEntries(apiPath, BATCH_SIZE);
      if (!Array.isArray(strapiEntries) || strapiEntries.length === 0) {
        console.log(`No Strapi ${contentType}s found`);
        continue;
      }

      console.log(`Found ${strapiEntries.length} Strapi ${contentType}s to process\n`);

      for (const strapiEntry of strapiEntries) {
        const slug = strapiEntry.slug || strapiEntry.attributes?.slug;
        const documentId = strapiEntry.documentId || strapiEntry.id;

        if (!slug || !documentId) {
          console.warn(`Skipping ${contentType}: missing slug or documentId`);
          skipped += 1;
          continue;
        }

        console.log(`Processing ${contentType}: "${slug}" (${documentId})...`);

        try {
          const wpEntry = await getWordPressEntryBySlug(conn, slug, wpPostType);
          if (!wpEntry) {
            console.warn(`  → No matching WordPress ${contentType} found`);
            skipped += 1;
            continue;
          }

          const postMeta = await getPostMeta(conn, wpEntry.ID);
          const seo = extractSeo(postMeta);

          if (!seo.title && !seo.description && !seo.canonicalUrl && !seo.keywords) {
            console.warn(`  → No SEO values found in WordPress postmeta`);
            skipped += 1;
            continue;
          }

          const seoPayload = pickDefined({
            metaTitle: seo.title,
            metaDescription: seo.description,
            canonicalUrl: seo.canonicalUrl,
            keywords: seo.keywords,
          });

          const success = await updateStrapiEntrySeo(contentType, documentId, seoPayload);
          if (success) {
            console.log(`  ✓ Updated`);
            updated += 1;
          } else {
            failed += 1;
          }
        } catch (error) {
          console.error(`  ✗ Error:`, summarizeError(error));
          failed += 1;
        }

        processed += 1;
      }
    }

    console.log(`\n=== MIGRATION SUMMARY ===`);
    console.log(`Total entries processed: ${processed}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Skipped (no match or no SEO found): ${skipped}`);
    console.log(`Failed: ${failed}`);
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('SEO migration failed:', summarizeError(error));
  process.exit(1);
});

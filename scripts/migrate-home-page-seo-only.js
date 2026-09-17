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
const PAGE_TYPE = process.env.WP_PAGE_TYPE || process.env.HOME_PAGE_TYPE || 'page';
const PAGE_SLUG = (process.env.WP_PAGE_SLUG || process.env.HOME_PAGE_SLUG || 'home').trim();
const DRY_RUN = ['1', 'true', 'yes', 'on'].includes(String(process.env.DRY_RUN || '').toLowerCase()) || process.argv.includes('--dry-run');
const EXECUTE = ['1', 'true', 'yes', 'on'].includes(String(process.env.EXECUTE || '').toLowerCase()) || process.argv.includes('--execute');

const WP_DB = {
  host: (process.env.WP_DB_HOST || process.env.DATABASE_HOST || '127.0.0.1').trim(),
  port: Number(process.env.WP_DB_PORT || process.env.DATABASE_PORT || 3306),
  user: (process.env.WP_DB_USER || process.env.DATABASE_USERNAME || '').trim(),
  password: (process.env.WP_DB_PASSWORD || process.env.DATABASE_PASSWORD || '').trim(),
  database: (process.env.WP_DB_NAME || process.env.DATABASE_NAME || '').trim(),
};

// Optional: allow forcing the script to use Strapi DB settings from .env
if (String(process.env.FORCE_USE_STRAPI_DB || '').toLowerCase() === '1' || String(process.env.FORCE_USE_STRAPI_DB || '').toLowerCase() === 'true') {
  WP_DB.host = (process.env.DATABASE_HOST || WP_DB.host).trim();
  WP_DB.port = Number(process.env.DATABASE_PORT || WP_DB.port);
  WP_DB.user = (process.env.DATABASE_USERNAME || process.env.DATABASE_USER || WP_DB.user).trim();
  WP_DB.password = (process.env.DATABASE_PASSWORD || WP_DB.password).trim();
  WP_DB.database = (process.env.DATABASE_NAME || WP_DB.database).trim();
}

// If WP_DB points to localhost/127.0.0.1 (common when only Strapi DB is available),
// assume the intended source is the Strapi DB and use those credentials.
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

function pickDefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function normalizeMetaValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }

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
    if (value === undefined || value === null || value === '') {
      return;
    }
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

async function getWordPressHomePage(conn) {
  const [rows] = await conn.query(
    `SELECT ID, post_title, post_name FROM ${table('posts')} WHERE post_type = ? AND post_name = ? LIMIT 1`,
    [PAGE_TYPE, PAGE_SLUG]
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

async function getStrapiPageBySlug(slug) {
  const response = await strapiRequest('get', '/api/pages', {
    params: {
      'filters[slug][$eq]': slug,
      'pagination[pageSize]': 1,
    },
  });
  return Array.isArray(response?.data) ? response.data[0] : null;
}

async function updateStrapiPageSeo(documentId, seo) {
  const payload = { data: { seo } };
  if (!EXECUTE) {
    console.log('[DRY_RUN] Would update Strapi page', documentId, 'with SEO payload:', JSON.stringify(payload, null, 2));
    return;
  }

  await strapiRequest('put', `/api/pages/${documentId}`, { data: payload });
}

async function main() {
  if (!STRAPI_TOKEN && !DRY_RUN) {
    throw new Error('Missing required environment variable: STRAPI_API_TOKEN');
  }
  if (!WP_DB.user) {
    throw new Error('Missing required WordPress DB credentials');
  }
  if (!PAGE_SLUG) {
    throw new Error('Missing target homepage slug; set WP_PAGE_SLUG or HOME_PAGE_SLUG');
  }

  console.log(`Running homepage SEO migration for slug="${PAGE_SLUG}"`);
  console.log(`Running homepage SEO migration for slug="${PAGE_SLUG}"`);
  // Safe DB config debug (mask password) to diagnose connection issues during dry-runs
  try {
    const safe = {
      host: String(WP_DB.host || '').slice(0, 200),
      port: Number(WP_DB.port || 0),
      user: String(WP_DB.user || '').slice(0, 200),
      database: String(WP_DB.database || '').slice(0, 200),
      password: WP_DB.password ? '***' : '(none)',
    };
    console.log('Effective WP DB config:', JSON.stringify(safe));
  } catch (e) {
    /* ignore logging errors */
  }
  const conn = await mysql.createConnection(WP_DB);
  try {
    const wpPage = await getWordPressHomePage(conn);
    if (!wpPage) {
      throw new Error(`Could not find WordPress page with slug "${PAGE_SLUG}" and type "${PAGE_TYPE}"`);
    }

    console.log(`Found WordPress page ID=${wpPage.ID} title="${wpPage.post_title || ''}"`);

    const postMeta = await getPostMeta(conn, wpPage.ID);
    const seo = extractSeo(postMeta);

    if (!seo.title && !seo.description && !seo.canonicalUrl && !seo.keywords) {
      console.warn('No SEO values were extracted from WordPress postmeta for this page.');
    }

    const strapiPage = await getStrapiPageBySlug(PAGE_SLUG);
    if (!strapiPage) {
      throw new Error(`Could not find Strapi page with slug "${PAGE_SLUG}"`);
    }

    const documentId = strapiPage.documentId || strapiPage.id;
    if (!documentId) {
      throw new Error(`Strapi page record is missing documentId/id for slug "${PAGE_SLUG}"`);
    }

    // Inspect existing Strapi page to confirm available attributes before updating
    try {
      const existing = await strapiRequest('get', `/api/pages/${documentId}`, { params: { populate: '*' } });
      console.log('Strapi page keys:', Object.keys(existing || {}));
      const attrs = existing?.data?.attributes || existing?.data || existing || {};
      console.log('Strapi page attribute keys:', Object.keys(attrs));
      if (attrs && attrs.acf) {
        try {
          const acfPreview = JSON.stringify(attrs.acf, null, 2).slice(0, 2000);
          console.log('Strapi page `acf` preview:', acfPreview);
        } catch (e) {
          console.warn('Could not stringify `acf` attribute');
        }
      }
    } catch (err) {
      console.warn('Could not fetch full Strapi page for inspection:', summarizeError(err));
    }

    const seoPayload = pickDefined({
      metaTitle: seo.title,
      metaDescription: seo.description,
      canonicalUrl: seo.canonicalUrl,
      keywords: seo.keywords,
    });

    if (Object.keys(seoPayload).length === 0) {
      console.warn('Skipping update because no defined SEO fields were found after normalization.');
      return;
    }

    console.log('Updating Strapi homepage SEO with:', JSON.stringify(seoPayload, null, 2));
    try {
      await updateStrapiPageSeo(documentId, seoPayload);
    } catch (err) {
      const detailsKey = err?.response?.data?.error?.details?.key || err?.response?.data?.error?.details?.key;
      console.error('Strapi update failed:', summarizeError(err));
      console.error('Full error (if axios):', err?.response?.data || err?.message || err);

      if (detailsKey === 'seo' || /Invalid key\s+seo/i.test(String(err?.response?.data?.error?.message || ''))) {
        console.log('Strapi indicates `seo` is not a valid field on this content-type. Falling back to updating `acf` attributes.');
        try {
          const existing = await strapiRequest('get', `/api/pages/${documentId}`, { params: { populate: '*' } });
          const attrs = existing?.data?.attributes || existing?.data || existing || {};
          const currentAcf = (attrs && attrs.acf) || {};

          const mergedAcf = {
            ...currentAcf,
            rank_math_title: seoPayload.metaTitle || currentAcf.rank_math_title,
            rank_math_description: seoPayload.metaDescription || currentAcf.rank_math_description,
            _yoast_wpseo_title: seoPayload.metaTitle || currentAcf._yoast_wpseo_title,
            _yoast_wpseo_metadesc: seoPayload.metaDescription || currentAcf._yoast_wpseo_metadesc,
          };

          const acfPayload = { data: { acf: mergedAcf } };
          if (!EXECUTE) {
            console.log('[DRY_RUN] Would update Strapi page `acf` with:', JSON.stringify(acfPayload, null, 2));
            return;
          }

          await strapiRequest('put', `/api/pages/${documentId}`, { data: acfPayload });
          console.log('Successfully updated `acf` with SEO values.');
        } catch (err2) {
          console.error('Fallback update to `acf` failed:', summarizeError(err2));
        }
      }

      return;
    }

    console.log('Homepage SEO migration completed successfully.');
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('Homepage SEO migration failed:', summarizeError(error));
  process.exit(1);
});

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const WP_PAGE_IDS = [60, 2071, 6521, 6837, 7163, 7417];
const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:3123';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
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

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeMetaValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return '';
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
      case 'N': return null;
      case 'b': return readUntil(';') === '1';
      case 'i': return Number(readUntil(';'));
      case 'd': return Number(readUntil(';'));
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
        const entries = [];
        const object = {};
        let isSequentialArray = true;
        for (let i = 0; i < count; i += 1) {
          const key = parseValue();
          const entryValue = parseValue();
          object[key] = entryValue;
          entries.push([key, entryValue]);
          if (!Number.isInteger(key) || key !== i) isSequentialArray = false;
        }
        expect('}');
        return isSequentialArray ? entries.map(([, val]) => val) : object;
      }
      default: throw new Error(`Unsupported PHP serialized type "${type}"`);
    }
  }
  return parseValue();
}

function table(name) {
  return `${TABLE_PREFIX}${name}`;
}

async function strapiRequest(method, apiPath, { data, params } = {}) {
  const axios = require('axios');
  const url = new URL(apiPath, STRAPI_URL);
  const headers = {};
  if (STRAPI_TOKEN) headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v == null || v === '') return;
      if (Array.isArray(v)) v.forEach(x => searchParams.append(k, String(x)));
      else searchParams.append(k, String(v));
    });
  }
  url.search = searchParams.toString();

  try {
    const response = await axios({ method, url, data, headers, maxBodyLength: Infinity });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Strapi request failed: ${JSON.stringify({
        method, url: url.toString(),
        status: error.response?.status, statusText: error.response?.statusText,
        data: error.response?.data,
      }, null, 2)}`);
    }
    throw error;
  }
}

async function getPostMeta(conn, wpPostId) {
  const [rows] = await conn.query(`SELECT meta_key, meta_value FROM ${table('postmeta')} WHERE post_id = ?`, [wpPostId]);
  const acf = {};
  for (const row of rows) {
    if (!row.meta_key || row.meta_key.startsWith('_')) continue;
    acf[row.meta_key] = normalizeMetaValue(row.meta_value);
  }
  return acf;
}

async function getStrapiPageByWpSlug(wpSlug) {
  const res = await strapiRequest('get', '/api/pages', { params: { 'filters[slug][$eq]': wpSlug, 'pagination[pageSize]': 1 } });
  return res?.data?.[0] || null;
}

async function main() {
  const conn = await mysql.createConnection(WP_DB);
  try {
    for (const wpId of WP_PAGE_IDS) {
      console.log(`Processing WordPress page ${wpId}`);
      const [wpPosts] = await conn.query(`SELECT post_name FROM ${table('posts')} WHERE ID = ?`, [wpId]);
      if (wpPosts.length === 0) {
        console.log(`  WordPress page not found`);
        continue;
      }
      const wpSlug = wpPosts[0].post_name;
      
      const strapiPage = await getStrapiPageByWpSlug(wpSlug);
      if (!strapiPage) {
        console.log(`  No Strapi page found for slug ${wpSlug}`);
        continue;
      }
      console.log(`  Found Strapi page ${strapiPage.id} (slug ${wpSlug})`);
      
      const acf = await getPostMeta(conn, wpId);
      console.log(`  Got ${Object.keys(acf).length} ACF fields`);

      await strapiRequest('put', `/api/pages/${strapiPage.documentId || strapiPage.id}`, {
        data: { acf }
      });
      console.log(`  Updated Strapi page acf field`);
    }
    console.log('Done!');
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mysql = require('mysql2/promise');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const STRAPI_URL = (process.env.STRAPI_URL || 'http://localhost:3123').replace(/\/$/, '');
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || '';
const PAGE_SIZE = Number(process.env.BACKFILL_PAGE_SIZE || 50);
const DRY_RUN = process.argv.includes('--dry-run');

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
    ? Number(process.env.WP_DB_PORT || process.env.DATABASE_PORT || 3306)
    : Number(process.env.DATABASE_PORT || process.env.WP_DB_PORT || 3306),
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

const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';

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

if (!STRAPI_API_TOKEN) {
  console.error('Missing STRAPI_API_TOKEN');
  process.exit(1);
}

const client = axios.create({
  baseURL: STRAPI_URL,
  headers: {
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

const table = (name) => `${TABLE_PREFIX}${name}`;

function extractLayoutTypes(acf, allowedTypes = null) {
  if (!acf || typeof acf !== 'object') {
    return [];
  }

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

async function fetchAll(endpoint, extraParams = {}) {
  const items = [];
  let page = 1;
  let pageCount = 1;

  do {
    const response = await client.get(endpoint, {
      params: {
        'pagination[page]': page,
        'pagination[pageSize]': PAGE_SIZE,
        ...extraParams,
      },
    });

    const payload = response.data;
    if (Array.isArray(payload?.data)) {
      items.push(...payload.data);
    }

    pageCount = Number(payload?.meta?.pagination?.pageCount || 1);
    page += 1;
  } while (page <= pageCount);

  return items;
}

function parseJsonObject(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchPostsFromDb(conn) {
  const posts = [];
  let offset = 0;

  while (true) {
    const [rows] = await conn.query(
      `
        SELECT id, document_id, title, slug, layout, acf
        FROM posts
        WHERE acf IS NOT NULL
          AND acf <> ''
          AND (
            acf LIKE '%categoryTermIds%'
            OR acf REGEXP 'layouts_[0-9]+_layout_type'
          )
        ORDER BY id ASC
        LIMIT ? OFFSET ?
      `,
      [PAGE_SIZE, offset]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      break;
    }

    for (const row of rows) {
      posts.push({
        id: row.id,
        documentId: row.document_id,
        title: row.title,
        slug: row.slug,
        layout: row.layout,
        acf: parseJsonObject(row.acf),
      });
    }

    offset += rows.length;
  }

  return posts;
}

async function loadCategoryMaps(conn) {
  const [wpRows] = await conn.query(
    `
      SELECT t.term_id, t.slug, t.name
      FROM ${table('terms')} AS t
      JOIN ${table('term_taxonomy')} AS tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'category'
    `
  );

  const wpByTermId = new Map();
  for (const row of wpRows) {
    wpByTermId.set(Number(row.term_id), {
      slug: String(row.slug || '').trim(),
      name: String(row.name || '').trim(),
    });
  }

  const categories = await fetchAll('/api/categories', {
    'fields[0]': 'name',
    'fields[1]': 'slug',
  });

  const strapiBySlug = new Map();
  for (const category of categories) {
    const slug = String(category?.slug || '').trim();
    if (slug) {
      strapiBySlug.set(slug, category.documentId || category.id);
    }
  }

  return { wpByTermId, strapiBySlug };
}

async function main() {
  const conn = await mysql.createConnection(WP_DB);

  try {
    const { wpByTermId, strapiBySlug } = await loadCategoryMaps(conn);
    const posts = await fetchPostsFromDb(conn);

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const failures = [];

    console.log(`Loaded ${posts.length} candidate posts for category/layout backfill`);

    for (const post of posts) {
      try {
        if (!post?.documentId) {
          skipped += 1;
          continue;
        }

        const acf = post?.acf;
        const categoryTermIds = Array.isArray(acf?._migration?.categoryTermIds)
          ? acf._migration.categoryTermIds.map((value) => Number(value)).filter(Number.isFinite)
          : [];
        const layoutTypes = extractLayoutTypes(acf, ['faq_section_block']);

        const categoryDocumentIds = categoryTermIds
          .map((termId) => wpByTermId.get(termId))
          .filter(Boolean)
          .map((term) => strapiBySlug.get(term.slug))
          .filter(Boolean);

        const nextLayout = layoutTypes.join(', ');
        const currentLayout = typeof post?.layout === 'string' ? post.layout.trim() : '';
        const categoriesChanged = categoryDocumentIds.length > 0;
        const layoutChanged = Boolean(nextLayout) && nextLayout !== currentLayout;

        if (!categoriesChanged && !layoutChanged) {
          skipped += 1;
          continue;
        }

        const payload = { data: {} };
        if (categoriesChanged) {
          payload.data.categories = categoryDocumentIds;
        }
        if (layoutChanged) {
          payload.data.layout = nextLayout;
        }

        if (DRY_RUN) {
          console.log(`[DRY_RUN] ${post.documentId}: ${JSON.stringify(payload.data)}`);
        } else {
          await client.put(`/api/posts/${post.documentId}`, payload);
          console.log(`[UPDATED] ${post.documentId}: ${JSON.stringify(payload.data)}`);
        }

        updated += 1;
      } catch (error) {
        failed += 1;
        const reason = error?.response?.data || error?.message || String(error);
        failures.push({
          documentId: post?.documentId || null,
          title: post?.title || null,
          reason,
        });
        console.error(`[FAILED] ${post?.documentId || 'unknown'}: ${typeof reason === 'string' ? reason : JSON.stringify(reason)}`);
      }
    }

    console.log(JSON.stringify({ updated, skipped, failed, dryRun: DRY_RUN }, null, 2));
    if (failures.length > 0) {
      console.log(JSON.stringify({ failures }, null, 2));
    }
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  const message = error?.response?.data || error.message || error;
  console.error(message);
  process.exit(1);
});

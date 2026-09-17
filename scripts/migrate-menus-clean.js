#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';
const WP_BASE_URL = process.env.WP_BASE_URL || '';

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

function generateUUID() {
  return crypto.randomUUID();
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';
}

function table(name) {
  return `${TABLE_PREFIX}${name}`;
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
    console.log('=== Step 1: Get WordPress Nav Menus ===');
    const menus = await getNavMenus(conn);

    console.log('=== Step 2: Delete existing menus and components ===');
    await cleanExistingMenus(conn);

    console.log('=== Step 3: Migrate menus ===');
    for (const menu of menus) {
      await migrateSingleMenu(conn, menu);
    }

    console.log('=== Step 4: Verify all menus have document_id ===');
    await ensureDocumentIds(conn);

    console.log('\n✅ Menu migration clean complete!');
  } finally {
    await conn.end();
  }
}

async function getNavMenus(conn) {
  const [rows] = await conn.query(`
    SELECT t.term_id, t.name, t.slug, tt.term_taxonomy_id
    FROM ${table('terms')} AS t
    JOIN ${table('term_taxonomy')} AS tt ON t.term_id = tt.term_id
    WHERE tt.taxonomy = 'nav_menu'
    ORDER BY t.term_id ASC
  `);
  return rows;
}

async function cleanExistingMenus(conn) {
  await conn.query('DELETE FROM menus_cmps');
  await conn.query('DELETE FROM components_navigation_menu_nodes_cmps');
  await conn.query('DELETE FROM components_navigation_menu_nodes');
  await conn.query('DELETE FROM components_shared_menu_items');
  await conn.query('DELETE FROM menus');
}

async function migrateSingleMenu(conn, menu) {
  console.log(`\nProcessing menu: ${menu.name} (term_id: ${menu.term_id})`);

  const [itemRows] = await conn.query(`
    SELECT p.ID, p.post_title, p.menu_order
    FROM ${table('posts')} AS p
    JOIN ${table('term_relationships')} AS tr ON p.ID = tr.object_id
    WHERE tr.term_taxonomy_id = ? AND p.post_type = 'nav_menu_item'
    ORDER BY p.menu_order ASC, p.ID ASC
  `, [menu.term_taxonomy_id]);

  const itemsById = new Map();
  const wpPostCache = new Map();
  for (const row of itemRows) {
    const meta = await getMenuItemMeta(conn, row.ID);
    let url = meta.url;
    let label = String(meta.title || '').trim() || String(row.post_title || '').trim();

    if (meta.type === 'post_type' && meta.objectId) {
      const [linkedPost] = await conn.query(
        `SELECT ID, post_title, post_name, post_type, guid FROM ${table('posts')} WHERE ID = ?`,
        [meta.objectId]
      );

      if (linkedPost.length > 0) {
  const wpPost = linkedPost[0];

  // Use linked page title if menu title is empty
  if (!label) {
    label = String(wpPost.post_title || '').trim();
  }

  if (!url) {
    if (WP_BASE_URL) {
      url = stripBaseUrl(
        normalizeRemoteUrl(wpPost.guid),
        WP_BASE_URL
      );
    } else {
      if (String(wpPost.post_type || '').toLowerCase() === 'post') {
        url = `/blog/${wpPost.post_name}`;
      } else {
        url = `/${wpPost.post_name}`;
      }
    }
  }
}


    }

    url = await resolveExactPageIdUrl(conn, wpPostCache, url);

    if (WP_BASE_URL && /^https?:\/\//i.test(url)) {
      url = stripBaseUrl(normalizeRemoteUrl(url), WP_BASE_URL);
    }

    itemsById.set(row.ID, {
      id: row.ID,
      label: label || `Menu Item ${row.ID}`,
      url: url || '/',
      targetBlank: meta.targetBlank,
      order: Number(row.menu_order) || 0,
      parentId: Number(meta.parentId) || 0,
    });
  }

  const childBuckets = new Map();
  const rootIds = [];

  function getItem(id) { return itemsById.get(id) || null; }
  
  function getRootId(item) {
    let current = item;
    const visited = new Set();
    while (current && current.parentId > 0) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      const parent = getItem(current.parentId);
      if (!parent) break;
      current = parent;
    }
    return current?.id || item.id;
  }

  for (const id of itemsById.keys()) {
    const item = getItem(id);
    if (!item) continue;
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
  uniqueRootIds.sort((a, b) => {
    const itemA = itemsById.get(a);
    const itemB = itemsById.get(b);
    return (itemA?.order || 0) - (itemB?.order || 0);
  });

  // Create the menu in Strapi
  const [menuResult] = await conn.query(
    'INSERT INTO menus (title, slug, wp_term_id, created_at, updated_at, published_at) VALUES (?, ?, ?, NOW(), NOW(), NOW())',
    [menu.name, slugify(menu.slug || menu.name), menu.term_id]
  );
  const menuId = menuResult.insertId;

  let componentOrder = 0;
  for (const rootId of uniqueRootIds) {
    const rootItem = itemsById.get(rootId);
    if (!rootItem) continue;

    const rootMenuItemId = await createMenuItem(conn, rootItem.label, rootItem.url, rootItem.targetBlank);
    const children = (childBuckets.get(rootId) || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const childMenuItemIds = [];
    for (const child of children) {
      const childId = await createMenuItem(conn, child.label, child.url, child.targetBlank);
      childMenuItemIds.push(childId);
    }

    const [nodeResult] = await conn.query(
      'INSERT INTO components_navigation_menu_nodes (`order`) VALUES (?)',
      [componentOrder]
    );
    const menuNodeId = nodeResult.insertId;

    await conn.query(
      'INSERT INTO components_navigation_menu_nodes_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, "shared.menu-item", "item", 1)',
      [menuNodeId, rootMenuItemId]
    );

    for (let i = 0; i < childMenuItemIds.length; i++) {
      await conn.query(
        'INSERT INTO components_navigation_menu_nodes_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, "shared.menu-item", "children", ?)',
        [menuNodeId, childMenuItemIds[i], i]
      );
    }

    await conn.query(
      'INSERT INTO menus_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, "navigation.menu-node", "items", ?)',
      [menuId, menuNodeId, componentOrder]
    );
    componentOrder++;
  }
  console.log(`  Successfully migrated menu: ${menu.name}`);
}

async function getMenuItemMeta(conn, postId) {
  const [metaRows] = await conn.query(
    `SELECT meta_key, meta_value FROM ${table('postmeta')} WHERE post_id = ?`,
    [postId]
  );
  const meta = {};
  for (const m of metaRows) {
    meta[m.meta_key] = m.meta_value;
  }

  return {
    type: String(meta._menu_item_type || ''),
    object: String(meta._menu_item_object || ''),
    objectId: meta._menu_item_object_id ? Number(meta._menu_item_object_id) : null,
    url: meta._menu_item_url || '',
    title: String(meta._menu_item_title || '').trim(),
    parentId: meta._menu_item_menu_item_parent ? Number(meta._menu_item_menu_item_parent) : 0,
    targetBlank: String(meta._menu_item_target || '') === '_blank',
  };
}

async function createMenuItem(conn, label, url, targetBlank) {
  const [insertResult] = await conn.query(
    'INSERT INTO components_shared_menu_items (label, url, target_blank) VALUES (?, ?, ?)',
    [label, url, targetBlank ? 1 : 0]
  );
  return insertResult.insertId;
}

function normalizeRemoteUrl(value) {
  if (!value) return '';
  let normalized = String(value).trim();
  normalized = normalized.replace(/^[\s`"'“”‘’]+/, '').replace(/[\s`"'“”‘’]+$/, '').trim();
  return normalized;
}

function stripBaseUrl(url, baseUrl) {
  const normalizedUrl = normalizeRemoteUrl(url);
  const normalizedBase = normalizeRemoteUrl(baseUrl);
  if (!normalizedUrl || !normalizedBase) return normalizedUrl;
  try {
    const base = new URL(normalizedBase);
    const parsed = new URL(normalizedUrl);
    if (base.host !== parsed.host) return normalizedUrl;
    const path = `${parsed.pathname || ''}${parsed.search || ''}${parsed.hash || ''}`;
    return path.startsWith('/') ? path : `/${path}`;
  } catch {
    return normalizedUrl;
  }
}

function buildInternalMenuUrl({ postType, postSlug, guid }) {
  const normalizedGuid = normalizeRemoteUrl(guid);
  if (normalizedGuid && WP_BASE_URL) {
    const stripped = stripBaseUrl(normalizedGuid, WP_BASE_URL);
    if (stripped && stripped.startsWith('/') && !extractExactPageId(stripped)) {
      return stripped;
    }
  }

  const normalizedSlug = String(postSlug || '').trim();
  if (!normalizedSlug) return '/';
  if (String(postType || '').toLowerCase() === 'post') return `/blog/${normalizedSlug}`;
  return `/${normalizedSlug}`;
}

function extractExactPageId(value) {
  const normalized = normalizeRemoteUrl(value);
  if (!normalized) return null;

  const match = normalized.match(/^\/\?page_id=(\d+)$/i);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function getPostPermalinkInfo(conn, postId) {
  const normalizedId = Number(postId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
  const [rows] = await conn.query(
    `SELECT ID, post_name, post_type, guid FROM ${table('posts')} WHERE ID = ?`,
    [normalizedId]
  );
  return rows[0] || null;
}

async function resolveExactPageIdUrl(conn, wpPostCache, rawUrl) {
  const normalizedRaw = normalizeRemoteUrl(rawUrl);
  if (!normalizedRaw) return rawUrl;

  let candidate = normalizedRaw;
  if (WP_BASE_URL && /^https?:\/\//i.test(candidate)) {
    candidate = stripBaseUrl(candidate, WP_BASE_URL);
  }

  const pageId = extractExactPageId(candidate);
  if (!pageId) return rawUrl;

  if (!wpPostCache.has(pageId)) {
    const wpPost = await getPostPermalinkInfo(conn, pageId);
    wpPostCache.set(pageId, wpPost || null);
  }

  const wpPost = wpPostCache.get(pageId);
  if (!wpPost) return rawUrl;

  return buildInternalMenuUrl({
    postType: wpPost.post_type,
    postSlug: wpPost.post_name,
    guid: wpPost.guid,
  });
}

async function ensureDocumentIds(conn) {
  const [menus] = await conn.query('SELECT id FROM menus WHERE document_id IS NULL');
  for (const menu of menus) {
    await conn.query('UPDATE menus SET document_id = ? WHERE id = ?', [generateUUID(), menu.id]);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');
const FormData = require('form-data');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const WP_PAGE_IDS = [60, 2071, 6521, 6837, 7163, 7417];
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:3123';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';
const uploadCache = new Map();
const stats = { media: { uploaded: 0, skipped: 0, failed: 0 } };

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
    process.env[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)"$/, '$1');
  }
}

function table(name) {
  return `${TABLE_PREFIX}${name}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMediaReference(entry) {
  return entry?.id || entry?.documentId || null;
}

async function uploadFileToStrapi(fileUrl, filename, conn) {
  const normalizedUrl = normalizeRemoteUrl(fileUrl);

  if (!normalizedUrl) {
    stats.media.skipped += 1;
    return null;
  }

  const cacheKey = `${normalizedUrl}::${filename}`;
  if (uploadCache.has(cacheKey)) {
    stats.media.skipped += 1;
    return uploadCache.get(cacheKey);
  }

  // Check if already in DB
  const [existing] = await conn.query(`SELECT id, documentId, url FROM files WHERE url LIKE ? OR name = ? LIMIT 1`,
    [`%${path.basename(normalizedUrl)}%`, filename || path.basename(new URL(normalizedUrl).pathname)]);
  if (existing.length > 0) {
    uploadCache.set(cacheKey, existing[0]);
    stats.media.skipped += 1;
    return existing[0];
  }

  try {
    const fileResponse = await axios.get(normalizedUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
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
      stats.media.uploaded +=1;
      return firstFile;
    }
  } catch (err) {
    stats.media.failed +=1;
    console.warn(`  Failed to upload ${normalizedUrl}`);
  }

  return null;
}

function normalizeRemoteUrl(value) {
  if (!isMeaningfulValue(value)) return '';
  let normalized = String(value).trim();
  normalized = normalized.replace(/^[\s`"'“”‘’]+/, '').replace(/[\s`"'“”‘’]+$/, '').trim();
  return normalized;
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length >0;
  if (typeof value === 'object') return Object.keys(value).length >0;
  return true;
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

async function linkMediaToComponent(conn, componentTable, componentId, fieldName, mediaId) {
  const [exists] = await conn.query(`SHOW TABLES LIKE '${componentTable}_${fieldName}_links'`);
  if (exists.length > 0) {
    await conn.query(`INSERT INTO ${componentTable}_${fieldName}_links (${componentTable}_id, file_id, \`order\`) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE file_id = ?`, [componentId, mediaId, mediaId]);
  }
}

async function createMenuItem(conn, buttonData) {
  if (!buttonData) return null;
  const label = buttonData.title || buttonData.label || 'Learn More';
  const url = buttonData.url || '';
  const targetBlank = ['_blank', 'blank', true, 1, '1'].includes(buttonData.target) ? 1 : 0;

  const [insertRes] = await conn.query('INSERT INTO components_shared_menu_items (label, url, target_blank) VALUES (?, ?, ?)', [label, url, targetBlank]);
  return insertRes.insertId;
}

async function linkMenuItem(conn, componentTable, componentId, fieldName, menuItemId) {
  const [exists] = await conn.query(`SHOW TABLES LIKE '${componentTable}_${fieldName}_component'`);
  if (exists.length > 0) {
    await conn.query(`INSERT INTO ${componentTable}_${fieldName}_component (${componentTable}_id, component_id, component_type, \`order\`) VALUES (?, ?, 'shared.menu-item', 1) ON DUPLICATE KEY UPDATE component_id = ?`, [componentId, menuItemId, menuItemId]);
  }
}

function parsePhpSerialized(input) {
  if (!input || typeof input !== 'string') return input;
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

  try {
    return parseValue();
  } catch (e) {
    return input;
  }
}

async function getWpPostMeta(conn, wpPostId) {
  const [metaRows] = await conn.query('SELECT meta_key, meta_value FROM qbo_postmeta WHERE post_id = ?', [wpPostId]);
  const meta = {};
  for (const row of metaRows) {
    if (row.meta_key.startsWith('_')) continue;
    meta[row.meta_key] = row.meta_value;
  }
  return meta;
}

async function processPage(conn, wpPageId) {
  try {
    console.log(`\nProcessing WordPress page ID: ${wpPageId}`);

    // Get WordPress post
    const [wpPosts] = await conn.query('SELECT ID, post_title, post_name FROM qbo_posts WHERE ID = ?', [wpPageId]);
    if (wpPosts.length === 0) {
      console.log('  WordPress page not found');
      return;
    }
    const wpPost = wpPosts[0];
    console.log(`  Title: ${wpPost.post_title}`);
    console.log(`  Slug: ${wpPost.post_name}`);

    // Get Strapi page
    const [strapiPages] = await conn.query('SELECT id FROM pages WHERE slug = ?', [wpPost.post_name]);
    if (strapiPages.length === 0) {
      console.log('  Strapi page not found');
      return;
    }
    const strapiPage = strapiPages[0];
    console.log(`  Strapi page ID: ${strapiPage.id}`);

    // Get WordPress postmeta
    const meta = await getWpPostMeta(conn, wpPageId);

    // Find the layout index
    let layoutIndex = null;
    for (let i = 0; i < 20; i++) {
      const countKey = `layouts_${i}_home_automation_edge_automation_edge_list_`;
      if (meta[countKey]) {
        layoutIndex = i;
        break;
      }
    }

    if (layoutIndex === null) {
      console.log('  No home automation edge list found');
      return;
    }
    console.log(`  Found at layout index: ${layoutIndex}`);

    // Extract main title, description, cta button
    const mainTitle = meta[`layouts_${layoutIndex}_home_automation_edge_main_title`];
    const description = meta[`layouts_${layoutIndex}_home_automation_edge_description`];
    const ctaButtonSerialized = meta[`layouts_${layoutIndex}_home_automation_edge_cta_button`];
    const ctaButton = ctaButtonSerialized ? parsePhpSerialized(ctaButtonSerialized) : null;

    // Get count of automation edge list items
    const countKey = `layouts_${layoutIndex}_home_automation_edge_automation_edge_list_`;
    const count = parseInt(meta[countKey], 10);
    console.log(`  Number of items: ${count}`);

    // Check if home automation edge component already exists for this page
    let componentId = null;
    const [pageCmps] = await conn.query(
      'SELECT cmp_id FROM pages_cmps WHERE entity_id = ? AND component_type = "acf-sections.home-automation-edge"',
      [strapiPage.id]
    );

    if (pageCmps.length > 0) {
      componentId = pageCmps[0].cmp_id;
      console.log(`  Existing component found, ID: ${componentId}`);
      await conn.query(
        'UPDATE components_acf_sections_home_automation_edge SET main_title = ?, description = ? WHERE id = ?',
        [mainTitle, description, componentId]
      );
    } else {
      console.log('  Creating new home automation edge component');
      const [insertResult] = await conn.query(
        'INSERT INTO components_acf_sections_home_automation_edge (main_title, description) VALUES (?, ?)',
        [mainTitle, description]
      );
      componentId = insertResult.insertId;
      console.log(`  New component ID: ${componentId}`);

      const [maxOrder] = await conn.query('SELECT MAX(`order`) as max_order FROM pages_cmps WHERE entity_id = ?', [strapiPage.id]);
      const newOrder = (maxOrder[0].max_order ?? -1) + 1;
      await conn.query(
        'INSERT INTO pages_cmps (entity_id, cmp_id, component_type, `order`) VALUES (?, ?, ?, ?)',
        [strapiPage.id, componentId, 'acf-sections.home-automation-edge', newOrder]
      );
    }



    // Clear existing automation edge list items
    await conn.query(
      'DELETE FROM components_acf_sections_home_automation_edge_cmps WHERE entity_id = ? AND field = "automation_edge_list"',
      [componentId]
    );

    // Insert each automation edge list item
    for (let i = 0; i < count; i++) {
      const prefix = `layouts_${layoutIndex}_home_automation_edge_automation_edge_list__${i}_`;
      const iconId = meta[`${prefix}icon`];
      const title = meta[`${prefix}title`];
      const desc = meta[`${prefix}description`];
      const buttonSerialized = meta[`${prefix}button`];
      const button = buttonSerialized ? parsePhpSerialized(buttonSerialized) : null;
      const imageId = meta[`${prefix}image`];

      const [itemInsert] = await conn.query(
        'INSERT INTO components_acf_shared_home_automation_edge_aut_8152fc00 (title, description) VALUES (?, ?)',
        [title, desc]
      );

      const itemId = itemInsert.insertId;
      await conn.query(
        'INSERT INTO components_acf_sections_home_automation_edge_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, ?, ?, ?)',
        [componentId, itemId, 'acf-shared.home-automation-edge-automation-edge-list', 'automation_edge_list', i]
      );

      console.log(`  Inserted item ${i + 1}/${count}: ${title}`);
    }

    console.log('  Page processed successfully!');

  } catch (error) {
    console.error(`  Failed to process page: ${error.message}`);
    console.error(error.stack);
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
    connectTimeout: Number(process.env.DATABASE_CONNECT_TIMEOUT || 60000)
  });

  try {
    for (const pageId of WP_PAGE_IDS) {
      await processPage(conn, pageId);
    }

    console.log('\nMigration complete!');
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

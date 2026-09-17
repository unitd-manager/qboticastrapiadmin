#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const mysql = require('mysql2/promise');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const DRY_RUN = process.env.DRY_RUN === 'true';
const STRAPI_URL = resolveStrapiUploadUrl();
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
const MIGRATE_MEDIA = process.env.MIGRATE_MEDIA !== 'false';
const MEDIA_DOWNLOAD_TIMEOUT_MS = Number(process.env.MEDIA_DOWNLOAD_TIMEOUT_MS || 30000);
const MEDIA_DOWNLOAD_RETRIES = Number(process.env.MEDIA_DOWNLOAD_RETRIES || 2);
const MEDIA_DOWNLOAD_DELAY_MS = Number(process.env.MEDIA_DOWNLOAD_DELAY_MS || 150);

const uploadCache = new Map();
const mediaStats = {
  uploaded: 0,
  reused: 0,
  skipped: 0,
  failed: 0,
  failures: []
};

const HTTP_HEADERS = {
  Accept: '*/*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
};

function isLocalHost(value) {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(String(value || '').toLowerCase());
}

function resolveStrapiUploadUrl() {
  const configuredUrl = process.env.STRAPI_URL || '';
  const publicUrl = process.env.PUBLIC_URL || process.env.STRAPI_PUBLIC_URL || '';

  try {
    if (configuredUrl) {
      const configured = new URL(configuredUrl);
      if (!isLocalHost(configured.hostname)) {
        return configuredUrl;
      }

      if (publicUrl) {
        const publicParsed = new URL(publicUrl);
        if (!isLocalHost(publicParsed.hostname)) {
          return publicUrl;
        }
      }
    }
  } catch {
    // Fall through to the configured or default URL below.
  }

  return configuredUrl || publicUrl || 'http://localhost:3123';
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

async function getWpPostMeta(connection, wpPostId) {
  const [metaRows] = await connection.query('SELECT meta_key, meta_value FROM qbo_postmeta WHERE post_id = ?', [wpPostId]);
  const meta = {};
  for (const row of metaRows) {
    meta[row.meta_key] = row.meta_value;
  }
  return meta;
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

function normalizeRemoteUrl(value) {
  if (!isMeaningfulValue(value)) {
    return '';
  }

  let normalized = String(value).trim();
  normalized = normalized.replace(/^[\s`"'“”‘’]+/, '').replace(/[\s`"'“”‘’]+$/, '').trim();
  return normalized;
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

function getServedMediaBaseUrl() {
  return process.env.PUBLIC_URL || process.env.STRAPI_PUBLIC_URL || STRAPI_URL;
}

function toAbsoluteMediaUrl(fileUrl) {
  if (!fileUrl) {
    return '';
  }

  try {
    return new URL(String(fileUrl), getServedMediaBaseUrl()).toString();
  } catch {
    return '';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function isServedFileReachable(fileRecord) {
  const absoluteUrl = toAbsoluteMediaUrl(fileRecord?.url);
  if (!absoluteUrl) {
    return false;
  }

  try {
    const response = await axios.head(absoluteUrl, {
      timeout: Math.min(MEDIA_DOWNLOAD_TIMEOUT_MS, 10000),
      maxRedirects: 5,
      validateStatus: () => true,
      headers: HTTP_HEADERS
    });

    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

async function getAttachment(connection, attachmentId) {
  const normalizedId = Number(attachmentId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return null;
  }

  const [rows] = await connection.query(
    'SELECT ID, guid, post_title, post_name, post_mime_type FROM qbo_posts WHERE ID = ? AND post_type = "attachment"',
    [normalizedId]
  );

  return rows[0] || null;
}

async function uploadFileToStrapi(connection, fileUrl, filename) {
  const normalizedUrl = normalizeRemoteUrl(fileUrl);
  const preferredFilename = getPreferredUploadFilename(normalizedUrl, filename);
  const preferredExtension = path.extname(preferredFilename).toLowerCase();

  if (!MIGRATE_MEDIA || !normalizedUrl) {
    mediaStats.skipped += 1;
    return null;
  }

  const cacheKey = `${normalizedUrl}::${preferredFilename}`;
  if (uploadCache.has(cacheKey)) {
    mediaStats.reused += 1;
    return uploadCache.get(cacheKey);
  }

  const [existing] = await connection.query(
    'SELECT id, url, mime, ext, name FROM files WHERE url LIKE ? OR name = ? LIMIT 1',
    [`%${path.basename(normalizedUrl)}%`, preferredFilename.replace(path.extname(preferredFilename), '')]
  );

  if (existing.length > 0) {
    const existingFile = existing[0];
    const existingExtension = String(existingFile.ext || '').toLowerCase();
    const existingMime = String(existingFile.mime || '').toLowerCase();
    const isBadSvgUpload =
      preferredExtension === '.svg' &&
      (existingExtension === '.xml' || existingMime === 'application/xml');
    const isReachable = await isServedFileReachable(existingFile);

    if (!isBadSvgUpload && isReachable) {
      uploadCache.set(cacheKey, existingFile);
      mediaStats.reused += 1;
      return existingFile;
    }
  }

  if (DRY_RUN) {
    mediaStats.skipped += 1;
    return null;
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
        headers: HTTP_HEADERS
      });

      const form = new FormData();
      form.append('files', Buffer.from(fileResponse.data), {
        filename: preferredFilename,
        contentType: fileResponse.headers['content-type'] || undefined
      });

      const headers = { ...form.getHeaders() };
      if (STRAPI_TOKEN) {
        headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
      }

      const uploadedResponse = await axios.post(`${STRAPI_URL}/api/upload`, form, { headers });
      const firstFile = Array.isArray(uploadedResponse.data) && uploadedResponse.data.length > 0 ? uploadedResponse.data[0] : null;
      if (!firstFile) {
        mediaStats.failed += 1;
        mediaStats.failures.push({
          url: normalizedUrl,
          filename: filename || null,
          reason: 'upload-response-empty'
        });
        return null;
      }

      uploadCache.set(cacheKey, firstFile);
      mediaStats.uploaded += 1;
      return firstFile;
    } catch (error) {
      if (attempt <= MEDIA_DOWNLOAD_RETRIES && isRetryableError(error)) {
        await sleep((attempt + 1) * 1000);
        continue;
      }

      mediaStats.failed += 1;
      mediaStats.failures.push({
        url: normalizedUrl,
        filename: filename || null,
        reason: error?.message || 'upload-failed'
      });
      return null;
    }
  }

  return null;
}

async function uploadAttachmentIdToStrapi(connection, attachmentId) {
  const attachment = await getAttachment(connection, attachmentId);
  if (!attachment?.guid) {
    return null;
  }

  return uploadFileToStrapi(
    connection,
    attachment.guid,
    getPreferredUploadFilename(
      attachment.guid,
      attachment.post_name || attachment.post_title || `attachment-${attachment.ID}`
    )
  );
}

async function linkMediaToComponent(connection, relatedType, componentId, fieldName, mediaId) {
  const [morphTables] = await connection.query(`SHOW TABLES LIKE 'files_related_mph'`);
  if (morphTables.length > 0) {
    await connection.query(
      `
      DELETE FROM files_related_mph
      WHERE related_id = ?
        AND related_type = ?
        AND field = ?
      `,
      [componentId, relatedType, fieldName]
    );

    await connection.query(
      `
      INSERT INTO files_related_mph
      (file_id, related_id, related_type, field, \`order\`)
      VALUES (?, ?, ?, ?, ?)
      `,
      [mediaId, componentId, relatedType, fieldName, 1]
    );
    return;
  }

  const [legacyTables] = await connection.query(`SHOW TABLES LIKE '%${fieldName}%links'`);
  if (legacyTables.length > 0) {
    const tableName = Object.values(legacyTables[0])[0];
    const [columns] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
    const ownerColumn = columns.find((column) => column.Field.endsWith('_id') && column.Field !== 'file_id');

    if (ownerColumn) {
      await connection.query(
        `INSERT INTO ${tableName} (${ownerColumn.Field}, file_id, \`order\`) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE file_id = ?`,
        [componentId, mediaId, mediaId]
      );
    }
  }
}

async function linkButtonToItem(connection, itemId, buttonCmpId) {
  const [cmpsTable] = await connection.query('SHOW TABLES LIKE "components_acf_shared_home_automation_edge_aut_8152fc00_cmps"');
  if (cmpsTable.length > 0) {
    await connection.query(
      `
      INSERT INTO components_acf_shared_home_automation_edge_aut_8152fc00_cmps
      (entity_id, cmp_id, component_type, field, \`order\`)
      VALUES (?, ?, ?, ?, ?)
      `,
      [itemId, buttonCmpId, 'shared.menu-item', 'button', 0]
    );
    return;
  }

  const [legacyTable] = await connection.query('SHOW TABLES LIKE "components_acf_shared_home_automation_edge_aut_8152fc00_button_component"');
  if (legacyTable.length > 0) {
    await connection.query(
      `
      INSERT INTO components_acf_shared_home_automation_edge_aut_8152fc00_button_component
      (components_acf_shared_home_automation_edge_aut_8152fc00_id, component_id, component_type, \`order\`)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE component_id = VALUES(component_id), component_type = VALUES(component_type)
      `,
      [itemId, buttonCmpId, 'shared.menu-item', 1]
    );
  }
}

function parsePhpSerialized(input) {
  if (!input || typeof input !== 'string') {
    return input;
  }

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

function getAutomationEdgeCount(meta, layoutIndex) {
  const countKey = `layouts_${layoutIndex}_home_automation_edge_automation_edge_list_`;

  let count = parseInt(meta[countKey], 10);

  // Fallback: derive count from repeater row keys
  if (!Number.isInteger(count) || count <= 0) {
    const regex = new RegExp(
      `^layouts_${layoutIndex}_home_automation_edge_automation_edge_list__([0-9]+)_`
    );

    const indexes = new Set();

    for (const key of Object.keys(meta)) {
      const match = key.match(regex);
      if (match) {
        indexes.add(Number(match[1]));
      }
    }

    count = indexes.size;
  }

  return count;
}

async function migratePage(
  connection,
  strapiPageId,
  wpPostId,
  meta,
  layoutIndex
) {
  const automationEdgeList = [];

  const count = getAutomationEdgeCount(meta, layoutIndex);

  if (count) {
    console.log(
      `Found count for layout ${layoutIndex} on page ${wpPostId}: ${count}`
    );
  }

  if (!count) {
    return {
      status: 'skipped',
      reason: 'no-automation-edge-list'
    };
  }

  for (let i = 0; i < count; i++) {
    const title =
      meta[
        `layouts_${layoutIndex}_home_automation_edge_automation_edge_list__${i}_title`
      ];

    const description =
      meta[
        `layouts_${layoutIndex}_home_automation_edge_automation_edge_list__${i}_description`
      ];

    const buttonSerialized =
      meta[
        `layouts_${layoutIndex}_home_automation_edge_automation_edge_list__${i}_button`
      ];
    const button = buttonSerialized ? parsePhpSerialized(buttonSerialized) : null;

    const iconValue = meta[
      `layouts_${layoutIndex}_home_automation_edge_automation_edge_list__${i}_icon`
    ];
    const imageValue = meta[
      `layouts_${layoutIndex}_home_automation_edge_automation_edge_list__${i}_image`
    ];

    const hasMeaningfulValue =
      (typeof title === 'string' && title.trim() !== '') ||
      (typeof description === 'string' && description.trim() !== '') ||
      (button && typeof button === 'object' && Object.keys(button).length > 0) ||
      isMeaningfulValue(iconValue) ||
      isMeaningfulValue(imageValue);

    if (hasMeaningfulValue) {
      automationEdgeList.push({
        title: title || '',
        description: description || '',
        icon: iconValue || null,
        image: imageValue || null,
        button: button
          ? {
              title: button.title || '',
              url: button.url || '',
              target: button.target || ''
            }
          : null
      });
    }
  }

  if (automationEdgeList.length === 0) {
    return {
      status: 'skipped',
      reason: 'empty-automation-edge-list'
    };
  }

  const [pageCmps] = await connection.query(
    `
    SELECT *
    FROM pages_cmps
    WHERE entity_id = ?
      AND component_type = 'acf-sections.home-automation-edge'
    `,
    [strapiPageId]
  );

  if (pageCmps.length === 0) {
    return {
      status: 'skipped',
      reason: 'no-home-automation-edge-component'
    };
  }

  const componentId = pageCmps[0].cmp_id;

  await connection.query(
    `
    DELETE
    FROM components_acf_sections_home_automation_edge_cmps
    WHERE entity_id = ?
      AND field = 'automation_edge_list'
    `,
    [componentId]
  );
  
  for (let i = 0; i < automationEdgeList.length; i++) {
    const item = automationEdgeList[i];

    let buttonCmpId = null;
    if (item.button) {
      const [buttonInsertResult] = await connection.query(
        `
        INSERT INTO components_shared_menu_items
        (label, url, target_blank)
        VALUES (?, ?, ?)
        `,
        [item.button.title, item.button.url, item.button.target === '_blank' ? 1 : 0]
      );

      buttonCmpId = buttonInsertResult.insertId;
    }

    let iconFile = null;
    if (item.icon) {
      iconFile = await uploadAttachmentIdToStrapi(connection, item.icon);
    }

    let imageFile = null;
    if (item.image) {
      imageFile = await uploadAttachmentIdToStrapi(connection, item.image);
    }

    const [insertResult] = await connection.query(
      `
      INSERT INTO
      components_acf_shared_home_automation_edge_aut_8152fc00
      (title, description)
      VALUES (?, ?)
      `,
      [item.title, item.description]
    );

    const itemId = insertResult.insertId;

    if (iconFile?.id) {
      await linkMediaToComponent(connection, 'acf-shared.home-automation-edge-automation-edge-list', itemId, 'icon', iconFile.id);
    }

    if (imageFile?.id) {
      await linkMediaToComponent(connection, 'acf-shared.home-automation-edge-automation-edge-list', itemId, 'image', imageFile.id);
    }

    if (buttonCmpId) {
      await linkButtonToItem(connection, itemId, buttonCmpId);
    }

    await connection.query(
      `
      INSERT INTO
      components_acf_sections_home_automation_edge_cmps
      (entity_id, cmp_id, component_type, field, \`order\`)
      VALUES (?, ?, ?, ?, ?)
      `,
      [componentId, itemId, 'acf-shared.home-automation-edge-automation-edge-list', 'automation_edge_list', i]
    );
  }

  return { status: 'migrated', itemsCount: automationEdgeList.length };
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
    connectTimeout: Number(process.env.DATABASE_CONNECT_TIMEOUT || 60000)
  });

  try {
    // Get all WordPress pages that might have home automation edge data
    const [wpPosts] = await connection.query(`
      SELECT DISTINCT p.ID, p.post_title, p.post_name 
      FROM qbo_posts p 
      JOIN qbo_postmeta pm ON p.ID = pm.post_id 
      WHERE p.post_type = 'page' 
        AND pm.meta_key LIKE 'layouts_%_home_automation_edge%'
    `);
    console.log(`Found ${wpPosts.length} WordPress pages with home automation edge data`);
    
    const [strapiPages] = await connection.query('SELECT id, slug FROM pages');
    console.log(`Found ${strapiPages.length} Strapi pages`);
    
    const strapiPageBySlug = {};
    for (const page of strapiPages) {
      strapiPageBySlug[page.slug] = page.id;
    }
    
    const summary = { scanned: 0, migrated: 0, skipped: 0, failed: 0 };
    for (const wpPost of wpPosts) {
      summary.scanned += 1;
      const strapiPageId = strapiPageBySlug[wpPost.post_name];
      if (!strapiPageId) {
        console.log(`Skip WordPress page ${wpPost.post_name} (ID ${wpPost.ID}): no corresponding Strapi page found`);
        summary.skipped += 1;
        continue;
      }
      
      try {
        const meta = await getWpPostMeta(connection, wpPost.ID);
        let migrated = false;

        // Check all layout indices from 0 to 100
        for (let layoutIndex = 0; layoutIndex < 100; layoutIndex++) {
          const result = await migratePage(connection, strapiPageId, wpPost.ID, meta, layoutIndex);
          if (result.status === 'migrated') {
            console.log(`Migrated page ${wpPost.post_name} (ID ${wpPost.ID}): ${result.itemsCount} items`);
            summary.migrated += 1;
            migrated = true;
            break;
          }

          if (result.reason) {
            console.log(`Page ${wpPost.post_name}, layout ${layoutIndex}: ${result.reason}`);
          }
        }

        if (!migrated) {
          summary.skipped += 1;
          console.log(`Skip page ${wpPost.post_name} (ID ${wpPost.ID}): no automation edge list found in any layout`);
        }
      } catch (error) {
        summary.failed += 1;
        console.error(`Failed page ${wpPost.post_name} (ID ${wpPost.ID}):`, error.message);
      }
    }
    
    summary.media = {
      uploaded: mediaStats.uploaded,
      reused: mediaStats.reused,
      skipped: mediaStats.skipped,
      failed: mediaStats.failed
    };

    console.log('\nMigration summary:', JSON.stringify(summary, null, 2));

    if (mediaStats.failures.length > 0) {
      console.log(
        '\nMedia failures (up to first 20):',
        JSON.stringify(mediaStats.failures.slice(0, 20), null, 2)
      );
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

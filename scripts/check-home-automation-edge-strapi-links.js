#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

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

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
  });

  try {
    const [pages] = await connection.query('SELECT id, slug FROM pages WHERE slug = "home" ORDER BY id');
    console.log('Home pages in Strapi:', pages);

    for (const page of pages) {
      const [pageCmps] = await connection.query(
        `
        SELECT cmp_id
        FROM pages_cmps
        WHERE entity_id = ?
          AND component_type = 'acf-sections.home-automation-edge'
        `,
        [page.id]
      );

      if (pageCmps.length === 0) {
        console.log(`No home-automation-edge component for page id ${page.id}`);
        continue;
      }

      const componentId = pageCmps[0].cmp_id;
      console.log(`\nPage ${page.id} componentId:`, componentId);

      const [links] = await connection.query(
        `
        SELECT cmp_id, \`order\`
        FROM components_acf_sections_home_automation_edge_cmps
        WHERE entity_id = ?
          AND field = 'automation_edge_list'
        ORDER BY \`order\`
        `,
        [componentId]
      );

      console.log('automation_edge_list linked items:', links.length);

      for (const link of links) {
        const itemId = link.cmp_id;
        const [itemRows] = await connection.query(
          'SELECT id, title FROM components_acf_shared_home_automation_edge_aut_8152fc00 WHERE id = ?',
          [itemId]
        );
        const item = itemRows[0] || { id: itemId, title: null };

        const [iconLinks] = await connection.query(
          'SELECT file_id FROM components_acf_shared_home_automation_edge_aut_8152fc00_icon_links WHERE components_acf_shared_home_automation_edge_aut_8152fc00_id = ?',
          [itemId]
        );

        const [imageLinks] = await connection.query(
          'SELECT file_id FROM components_acf_shared_home_automation_edge_aut_8152fc00_image_links WHERE components_acf_shared_home_automation_edge_aut_8152fc00_id = ?',
          [itemId]
        );

        console.log(
          `item ${item.id} order ${link.order} title="${item.title}" iconLinks=${iconLinks.length} imageLinks=${imageLinks.length}`
        );
      }
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

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
    const [pageRows] = await connection.query('SELECT id FROM pages WHERE slug = "home" LIMIT 1');
    const pageId = pageRows[0]?.id;
    if (!pageId) {
      console.log('Home page not found');
      return;
    }

    const [cmpRows] = await connection.query(
      `
      SELECT cmp_id
      FROM pages_cmps
      WHERE entity_id = ?
        AND component_type = 'acf-sections.home-automation-edge'
      LIMIT 1
      `,
      [pageId]
    );
    const componentId = cmpRows[0]?.cmp_id;
    if (!componentId) {
      console.log('Home automation edge component not found');
      return;
    }

    const [itemLinks] = await connection.query(
      `
      SELECT cmp_id, \`order\`
      FROM components_acf_sections_home_automation_edge_cmps
      WHERE entity_id = ?
        AND field = 'automation_edge_list'
      ORDER BY \`order\`
      `,
      [componentId]
    );

    for (const itemLink of itemLinks) {
      const [itemRows] = await connection.query(
        'SELECT id, title FROM components_acf_shared_home_automation_edge_aut_8152fc00 WHERE id = ?',
        [itemLink.cmp_id]
      );
      const item = itemRows[0];
      const [mediaRows] = await connection.query(
        `
        SELECT field, file_id
        FROM files_related_mph
        WHERE related_id = ?
          AND related_type = 'acf-shared.home-automation-edge-automation-edge-list'
        ORDER BY field, file_id
        `,
        [item.id]
      );

      console.log(`item ${item.id} order ${itemLink.order} title="${item.title}"`);
      console.log(mediaRows);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

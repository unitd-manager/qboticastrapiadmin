#!/usr/bin/env node
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

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

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    // Get home automation edge component
    const [strapiHomePages] = await conn.query('SELECT id FROM pages WHERE slug = "home" LIMIT 1');
    const strapiHomePageId = strapiHomePages[0].id;
    const [homePageCmps] = await conn.query('SELECT * FROM pages_cmps WHERE entity_id = ? AND component_type = "acf-sections.home-automation-edge"', [strapiHomePageId]);
    const componentId = homePageCmps[0].cmp_id;
    console.log('Home automation edge component ID:', componentId);

    // Get linked items
    const [linkedItems] = await conn.query('SELECT * FROM components_acf_sections_home_automation_edge_cmps WHERE entity_id = ? AND field = "automation_edge_list" ORDER BY `order`', [componentId]);
    console.log('Linked items:', linkedItems);

    // Get item data
    for (const link of linkedItems) {
      const [itemData] = await conn.query('SELECT * FROM components_acf_shared_home_automation_edge_aut_8152fc00 WHERE id = ?', [link.cmp_id]);
      console.log('Item data:', itemData[0]);
    }
  } finally {
    await conn.end();
  }
}

main().catch(console.error);

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

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

function generateUUID() {
  return crypto.randomUUID();
}

async function processTable(conn, tableName) {
  const [rows] = await conn.query(`SELECT id FROM ${tableName} WHERE document_id IS NULL`);
  console.log(`Processing ${tableName}: ${rows.length} rows without document_id`);
  for (const row of rows) {
    const uuid = generateUUID();
    await conn.query(`UPDATE ${tableName} SET document_id = ? WHERE id = ?`, [uuid, row.id]);
  }
  console.log(`Updated ${tableName} ✓`);
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
    await processTable(conn, 'menus');
    await processTable(conn, 'testimonials');
    await processTable(conn, 'components_navigation_menu_nodes');
    await processTable(conn, 'components_shared_menu_items');
    
    console.log('\n✅ All document IDs generated and updated!');
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';

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
    const [menus] = await conn.query(`
      SELECT t.term_id, t.name, t.slug, tt.term_taxonomy_id
      FROM ${table('terms')} AS t
      JOIN ${table('term_taxonomy')} AS tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'nav_menu' AND t.name = 'Primary Menu'
    `);

    const primaryMenu = menus[0];
    if (!primaryMenu) {
      console.log('Primary Menu not found');
      return;
    }

    const [itemRows] = await conn.query(`
      SELECT p.ID, p.post_title, p.menu_order
      FROM ${table('posts')} AS p
      JOIN ${table('term_relationships')} AS tr ON p.ID = tr.object_id
      WHERE tr.term_taxonomy_id = ? AND p.post_type = 'nav_menu_item'
      ORDER BY p.menu_order ASC, p.ID ASC
    `, [primaryMenu.term_taxonomy_id]);

    console.log('Primary Menu Items');
    for (const row of itemRows) {
      const [metaRows] = await conn.query(`SELECT meta_key, meta_value FROM ${table('postmeta')} WHERE post_id = ?`, [row.ID]);
      
      console.log(`\nID ${row.post_title} (ID: ${row.ID})`);
      metaRows.forEach(m => console.log(`  ${m.meta_key}: ${m.meta_value}`));

      const objectId = metaRows.find(m => m.meta_key === '_menu_item_object_id')?.meta_value;
      if (objectId) {
        const [linkedPost] = await conn.query(`SELECT * FROM ${table('posts')} WHERE ID = ?`, [objectId]);
        if (linkedPost.length > 0 && linkedPost[0].post_type !== 'nav_menu_item') {
          console.log('  Linked Non Menu Item Post:');
          console.log(`    ID: ${linkedPost[0].ID} title: ${linkedPost[0].post_title}, name: ${linkedPost[0].post_name}, type: ${linkedPost[0].post_type}, guid: ${linkedPost[0].guid}`);
        }
      }
    }

  } finally {
    await conn.end();
  }
}

main().catch(console.error);

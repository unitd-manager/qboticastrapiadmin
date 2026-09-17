#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

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
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
  });

  try {
    const [menus] = await conn.query('SELECT * FROM menus');
    
    for (const menu of menus) {
      console.log(`\n=== Menu: ${menu.title} (slug: ${menu.slug}) ===`);

      const [menuCmps] = await conn.query('SELECT * FROM menus_cmps WHERE entity_id = ? ORDER BY `order`', [menu.id]);
      for (const cmp of menuCmps) {
        const [menuNodes] = await conn.query('SELECT * FROM components_navigation_menu_nodes WHERE id = ?', [cmp.cmp_id]);
        if (menuNodes.length > 0) {
          const [nodeItemCmp] = await conn.query('SELECT * FROM components_navigation_menu_nodes_cmps WHERE entity_id = ? AND field = "item" LIMIT 1', [menuNodes[0].id]);
          if (nodeItemCmp.length > 0) {
            const [menuItem] = await conn.query('SELECT * FROM components_shared_menu_items WHERE id = ?', [nodeItemCmp[0].cmp_id]);
            if (menuItem.length > 0) {
              console.log(`  - ${menuItem[0].label} → ${menuItem[0].url} (target_blank: ${!!menuItem[0].target_blank})`);
              
              const [nodeChildrenCmps] = await conn.query('SELECT * FROM components_navigation_menu_nodes_cmps WHERE entity_id = ? AND field = "children" ORDER BY `order`', [menuNodes[0].id]);
              for (const childCmp of nodeChildrenCmps) {
                const [childItem] = await conn.query('SELECT * FROM components_shared_menu_items WHERE id = ?', [childCmp.cmp_id]);
                if (childItem.length > 0) {
                  console.log(`    └ ${childItem[0].label} → ${childItem[0].url} (target_blank: ${!!childItem[0].target_blank})`);
                }
              }
            }
          }
        }
      }
    }
  } finally {
    await conn.end();
  }
}

main().catch(console.error);

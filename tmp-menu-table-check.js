const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sepIdx = trimmed.indexOf('=');
    if (sepIdx === -1) continue;
    const key = trimmed.slice(0, sepIdx).trim();
    const value = trimmed.slice(sepIdx + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if (!key || process.env[key]) continue;
    process.env[key] = value;
  }
}

loadEnv(path.join(__dirname, '.env'));
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
  });
  try {
    const tables = [
      'menus_items_components',
      'menus_cmps',
      'components_navigation_menu_nodes_item_component',
      'components_navigation_menu_nodes_children_components',
      'components_navigation_menu_nodes_cmps',
    ];
    for (const name of tables) {
      const [rows] = await conn.query('SHOW TABLES LIKE ?', [name]);
      console.log(name, rows.length > 0 ? 'EXISTS' : 'MISSING');
    }
  } finally {
    await conn.end();
  }
})();

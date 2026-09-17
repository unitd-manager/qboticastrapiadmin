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
const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'qbo_';
const ids = process.argv.slice(2).map((v) => Number(v));

(async () => {
  if (!process.env.DATABASE_NAME) {
    console.error('DATABASE_NAME not set');
    process.exit(1);
  }
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
  });
  try {
    for (const id of ids) {
      const [postRows] = await conn.query(`SELECT ID, post_title, post_name, post_type, guid FROM ${TABLE_PREFIX}posts WHERE ID = ?`, [id]);
      console.log('ID', id, 'post row:', postRows[0]);
      const [metaRows] = await conn.query(`SELECT meta_key, meta_value FROM ${TABLE_PREFIX}postmeta WHERE post_id = ? ORDER BY meta_key`, [id]);
      console.log('meta rows');
      for (const m of metaRows) {
        if (m.meta_key && m.meta_key.includes('_menu_item')) {
          console.log(' ', m.meta_key, '=>', m.meta_value);
        }
      }
      console.log('---');
    }
  } finally {
    await conn.end();
  }
})();

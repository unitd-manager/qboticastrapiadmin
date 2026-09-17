const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnv(path.join(process.cwd(), '.env'));
const hasExplicit = Boolean((process.env.WP_DB_USER || '').trim() || (process.env.WP_DB_NAME || '').trim() || (process.env.WP_DB_PASSWORD || '').trim());
const cfg = {
  host: hasExplicit ? (process.env.WP_DB_HOST || process.env.DATABASE_HOST || '127.0.0.1') : (process.env.DATABASE_HOST || process.env.WP_DB_HOST || '127.0.0.1'),
  port: Number(hasExplicit ? (process.env.WP_DB_PORT || process.env.DATABASE_PORT || 3306) : (process.env.DATABASE_PORT || process.env.WP_DB_PORT || 3306)),
  user: hasExplicit ? (process.env.WP_DB_USER || process.env.DATABASE_USERNAME || '') : (process.env.DATABASE_USERNAME || process.env.WP_DB_USER || ''),
  password: hasExplicit ? (process.env.WP_DB_PASSWORD || process.env.DATABASE_PASSWORD || '') : (process.env.DATABASE_PASSWORD || process.env.WP_DB_PASSWORD || ''),
  database: hasExplicit ? (process.env.WP_DB_NAME || process.env.DATABASE_NAME || '') : (process.env.DATABASE_NAME || process.env.WP_DB_NAME || ''),
};
(async () => {
  const conn = await mysql.createConnection(cfg);
  try {
    const [rows] = await conn.query(`SELECT id, document_id, title, slug FROM pages ORDER BY id ASC LIMIT 25 OFFSET 175`);
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await conn.end();
  }
})().catch((err) => { console.error(err.message || err); process.exit(1); });

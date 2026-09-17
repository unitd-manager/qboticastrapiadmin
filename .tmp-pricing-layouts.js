const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
for (const line of fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  if (process.env[k] === undefined) process.env[k] = v;
}
const explicit = Boolean((process.env.WP_DB_USER || '').trim() || (process.env.WP_DB_NAME || '').trim() || (process.env.WP_DB_PASSWORD || '').trim());
const cfg = {
  host: explicit ? (process.env.WP_DB_HOST || process.env.DATABASE_HOST || '127.0.0.1') : (process.env.DATABASE_HOST || process.env.WP_DB_HOST || '127.0.0.1'),
  port: Number(explicit ? (process.env.WP_DB_PORT || process.env.DATABASE_PORT || 3306) : (process.env.DATABASE_PORT || process.env.WP_DB_PORT || 3306)),
  user: explicit ? (process.env.WP_DB_USER || process.env.DATABASE_USERNAME || '') : (process.env.DATABASE_USERNAME || process.env.WP_DB_USER || ''),
  password: explicit ? (process.env.WP_DB_PASSWORD || process.env.DATABASE_PASSWORD || '') : (process.env.DATABASE_PASSWORD || process.env.WP_DB_PASSWORD || ''),
  database: explicit ? (process.env.WP_DB_NAME || process.env.DATABASE_NAME || '') : (process.env.DATABASE_NAME || process.env.WP_DB_NAME || ''),
};
const prefix = process.env.WP_TABLE_PREFIX || 'qbo_';
(async () => {
  const conn = await mysql.createConnection(cfg);
  const [rows] = await conn.query(
    `SELECT pm.meta_key, pm.meta_value
     FROM ${prefix}postmeta pm
     JOIN ${prefix}posts p ON p.ID = pm.post_id
     WHERE p.post_type = 'page'
       AND p.post_name = 'pricing'
       AND pm.meta_key REGEXP '^layouts_[0-9]+_layout_type$'
     ORDER BY pm.meta_key ASC`
  );
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

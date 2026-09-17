const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const vm = require('vm');

const scriptPath = path.join(process.cwd(), 'scripts', 'migrate-wordpress-to-strapi.js');
let source = fs.readFileSync(scriptPath, 'utf8');
source = source.replace(/^#!.*\r?\n/, '');
const wrapped = `(function(require, __dirname, __filename, process, console, Buffer){${source}\n; return { buildPagePayload, getPostMeta, table, WP_DB, PAGE_POST_TYPE };})`;
const mod = vm.runInThisContext(wrapped)(require, path.dirname(scriptPath), scriptPath, process, console, Buffer);
(async () => {
  const conn = await mysql.createConnection(mod.WP_DB);
  const [rows] = await conn.query(`SELECT ID, post_title, post_name, post_content, post_excerpt, post_status, post_type, post_date, post_modified, guid FROM ${mod.table('posts')} WHERE post_type = ? AND post_name = ? LIMIT 1`, [mod.PAGE_POST_TYPE, 'pricing']);
  const row = rows[0];
  const metaResult = await mod.getPostMeta(conn, row.ID);
  const payload = await mod.buildPagePayload(row, metaResult, conn);
  fs.writeFileSync('.tmp-pricing-payload.json', JSON.stringify(payload, null, 2));
  console.log('wrote .tmp-pricing-payload.json');
  await conn.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

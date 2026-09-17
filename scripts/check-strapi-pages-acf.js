#!/usr/bin/env node
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
    process.env[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)"$/, '$1');
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
    connectTimeout: Number(process.env.DATABASE_CONNECT_TIMEOUT || 60000)
  });

  try {
    const slugs = ['home', 'doqumentai', 'new', 'home-2', 'qbotica-layout-sample', 'home-3'];
    for (const slug of slugs) {
      const [rows] = await connection.query('SELECT id, slug, acf FROM pages WHERE slug = ?', [slug]);
      if (rows.length > 0) {
        console.log(`Page: ${slug}`);
        console.log('  acf:', rows[0].acf ? (typeof rows[0].acf === 'string' ? rows[0].acf : JSON.stringify(rows[0].acf, null, 2)) : 'null');
      } else {
        console.log(`Page not found: ${slug}`);
      }
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

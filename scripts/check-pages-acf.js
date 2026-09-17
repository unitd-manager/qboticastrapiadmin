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
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
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
    const [pages] = await conn.query('SELECT id, slug, title, acf FROM pages LIMIT 10');
    console.log('=== Pages with ACF ===');
    pages.forEach(page => {
      console.log(`Page: ${page.title} (${page.slug})`);
      if (page.acf) {
        try {
          const acf = typeof page.acf === 'string' ? JSON.parse(page.acf) : page.acf;
          console.log('ACF keys:', Object.keys(acf));
          // Check for home_automation_edge
          if (acf.home_automation_edge) {
            console.log('home_automation_edge present, keys:', Object.keys(acf.home_automation_edge));
          }
        } catch (e) {
          console.log('ACF parse error:', e.message);
        }
      }
      console.log('---');
    });
  } finally {
    await conn.end();
  }
}

main().catch(console.error);

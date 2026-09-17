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
    const [pages] = await conn.query('SELECT id, slug, title, page_builder FROM pages LIMIT 10');
    console.log('=== Pages with pageBuilder ===');
    pages.forEach(page => {
      console.log(`Page: ${page.title} (${page.slug})`);
      if (page.page_builder) {
        try {
          const pb = typeof page.page_builder === 'string' ? JSON.parse(page.page_builder) : page.page_builder;
          console.log('Page builder length:', pb?.length);
          // Check for home_automation_edge
          pb?.forEach((component, idx) => {
            if (component.__component === 'acf-sections.home-automation-edge') {
              console.log(`Found home-automation-edge at index ${idx}:`, Object.keys(component));
            }
          });
        } catch (e) {
          console.log('pageBuilder parse error:', e.message);
        }
      }
      console.log('---');
    });
  } finally {
    await conn.end();
  }
}

main().catch(console.error);

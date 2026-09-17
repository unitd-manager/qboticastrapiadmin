#!/usr/bin/env node
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    // Check Strapi pages with slugs that might match
    const slugsToCheck = ['home', 'home-2', 'home-3', 'doqumentai', 'new', 'qbotica-layout-sample'];
    for (const slug of slugsToCheck) {
      const [pages] = await conn.query('SELECT id, slug, title FROM pages WHERE slug = ?', [slug]);
      if (pages.length > 0) {
        console.log(`Found Strapi page for slug "${slug}":`, pages[0]);
        // Check if it has a home automation edge component
        const [pageCmps] = await conn.query('SELECT * FROM pages_cmps WHERE entity_id = ? AND component_type = "acf-sections.home-automation-edge"', [pages[0].id]);
        if (pageCmps.length > 0) {
          console.log('  Has home automation edge component:', pageCmps[0]);
        } else {
          console.log('  No home automation edge component found');
        }
      } else {
        console.log(`No Strapi page found for slug "${slug}"`);
      }
    }
  } finally {
    await conn.end();
  }
}

main().catch(console.error);

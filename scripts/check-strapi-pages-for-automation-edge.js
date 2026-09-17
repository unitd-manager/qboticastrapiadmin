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
    const pageIds = [60, 2071, 6521, 6837, 7163, 7417];
    
    for (const wpPostId of pageIds) {
      console.log(`\n=== WordPress Page ID: ${wpPostId} ===`);
      
      const [posts] = await connection.query('SELECT ID, post_title, post_name FROM qbo_posts WHERE ID = ?', [wpPostId]);
      if (posts.length > 0) {
        console.log(`Post Title: ${posts[0].post_title}`);
        console.log(`Post Slug: ${posts[0].post_name}`);
        
        const [strapiPages] = await connection.query('SELECT id, slug FROM pages WHERE slug = ?', [posts[0].post_name]);
        if (strapiPages.length > 0) {
          console.log(`Strapi Page ID: ${strapiPages[0].id}`);
          
          const [pageCmps] = await connection.query(
            'SELECT * FROM pages_cmps WHERE entity_id = ? AND component_type = "acf-sections.home-automation-edge"',
            [strapiPages[0].id]
          );
          if (pageCmps.length > 0) {
            console.log(`Component found! CMP ID: ${pageCmps[0].cmp_id}`);
          } else {
            console.log('No home automation edge component found on this Strapi page');
          }
        } else {
          console.log('No matching Strapi page found by slug');
        }
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

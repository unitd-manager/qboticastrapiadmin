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
    const wpIds = [60, 2071, 6521, 6837, 7163, 7417];
    for (const wpId of wpIds) {
      console.log(`\nChecking WordPress post ID ${wpId}:`);
      
      // Get post info
      const [posts] = await conn.query('SELECT ID, post_title, post_name, post_type FROM qbo_posts WHERE ID = ?', [wpId]);
      if (posts.length > 0) {
        const post = posts[0];
        console.log(`  Title: ${post.post_title}`);
        console.log(`  Slug: ${post.post_name}`);
        console.log(`  Type: ${post.post_type}`);
      } else {
        console.log('  Post not found!');
        continue;
      }
      
      // Get postmeta
      const [meta] = await conn.query('SELECT meta_key, meta_value FROM qbo_postmeta WHERE post_id = ?', [wpId]);
      const automationMeta = meta.filter(m => m.meta_key.includes('automation_edge'));
      console.log('  Automation edge meta keys found:', automationMeta.map(m => m.meta_key));
    }
  } finally {
    await conn.end();
  }
}

main().catch(console.error);

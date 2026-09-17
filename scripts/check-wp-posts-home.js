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
    // Check wordpress_posts table columns
    console.log('=== wordpress_posts columns ===');
    const [wpPostsCols] = await conn.query('SHOW COLUMNS FROM wordpress_posts');
    console.log(wpPostsCols.map(c => c.Field).join(', '));

    // Check wordpress_posts table
    console.log('\n=== Checking wordpress_posts ===');
    const [wpPosts] = await conn.query('SELECT * FROM wordpress_posts LIMIT 3');
    console.log('Sample wordpress_posts:', wpPosts);
  } finally {
    await conn.end();
  }
}

main().catch(console.error);

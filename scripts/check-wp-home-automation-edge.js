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
  const wpDb = {
    host: process.env.WP_DB_HOST || process.env.DATABASE_HOST,
    port: Number(process.env.WP_DB_PORT || process.env.DATABASE_PORT),
    user: process.env.WP_DB_USER || process.env.DATABASE_USERNAME,
    password: process.env.WP_DB_PASSWORD || process.env.DATABASE_PASSWORD,
    database: process.env.WP_DB_NAME || process.env.DATABASE_NAME,
  };

  const conn = await mysql.createConnection(wpDb);

  try {
    const tablePrefix = process.env.WP_TABLE_PREFIX || 'qbo_';

    // First, find pages that might have home_automation_edge
    const [posts] = await conn.query(`SELECT ID, post_title, post_name FROM ${tablePrefix}posts WHERE post_type = 'page' LIMIT 10`);

    for (const post of posts) {
      console.log(`\n--- Page: ${post.post_title} (${post.post_name})`);
      const [meta] = await conn.query(
        `SELECT meta_key, meta_value FROM ${tablePrefix}postmeta WHERE post_id = ?`,
        [post.ID]
      );
      const acfMeta = meta.filter(m => m.meta_key.includes('home_automation_edge') || m.meta_key.includes('automation_edge'));
      if (acfMeta.length > 0) {
        console.log('Found relevant meta:');
        acfMeta.forEach(m => {
          console.log(`  ${m.meta_key}:`, m.meta_value?.slice(0, 200));
        });
      } else {
        console.log('No home_automation_edge meta found');
      }
    }

  } finally {
    await conn.end();
  }
}

main().catch(console.error);

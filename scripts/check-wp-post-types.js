#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

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
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
  });

  try {
    const [rows] = await conn.query('SELECT DISTINCT post_type FROM qbo_posts');
    console.log('WordPress Post Types:');
    console.log(rows.map(r => r.post_type));

    const [testimonialPosts] = await conn.query("SELECT * FROM qbo_posts WHERE post_type LIKE '%testimonial%'");
    console.log('\nTestimonial Posts:');
    console.log(testimonialPosts.length);
    if (testimonialPosts.length > 0) {
      console.log(testimonialPosts[0]);
    }

    const [comments] = await conn.query('SELECT * FROM qbo_comments LIMIT 5');
    console.log('\nComments sample:');
    console.log(comments);
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
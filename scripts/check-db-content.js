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
    const value = trimmed.slice(sepIdx + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
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
    console.log('=== Tables ===');
    const [tables] = await conn.query('SHOW TABLES');
    console.log(tables.map(t => Object.values(t)[0]).join('\n'));

    console.log('\n=== Pages table columns ===');
    const [pageCols] = await conn.query('SHOW COLUMNS FROM pages');
    console.log(pageCols.map(c => c.Field).join(', '));

    console.log('\n=== pages_cmps columns ===');
    const [pagesCmpsCols] = await conn.query('SHOW COLUMNS FROM pages_cmps');
    console.log(pagesCmpsCols.map(c => c.Field).join(', '));

    console.log('\n=== Sample page (first 5) ===');
    const [pages] = await conn.query('SELECT id, document_id, title, slug, acf FROM pages LIMIT 5');
    for (const page of pages) {
      console.log(`\nPage: ${page.title} (${page.slug})`);
      console.log('ACF:', page.acf ? JSON.stringify(page.acf, null, 2) : 'null');
      
      // Check page components
      console.log('\n--- Page components ---');
      const [pageCmps] = await conn.query('SELECT * FROM pages_cmps'); // Get all first to see structure
      console.log('First few page components:', pageCmps.slice(0, 5));
      
      if (pageCmps.length > 0) {
        // Find correct column name for page ID
        const pageIdCol = Object.keys(pageCmps[0]).find(k => k.includes('page'));
        for (const cmp of pageCmps.slice(0, 10)) {
          console.log(`\nComponent ${cmp.id}:`, cmp);
        }
      }
    }

    console.log('\n=== components_acf_sections_home_automation_edge ===');
    try {
      const [compCols] = await conn.query('SHOW COLUMNS FROM components_acf_sections_home_automation_edge');
      console.log('Columns:', compCols.map(c => c.Field).join(', '));
      const [comps] = await conn.query('SELECT * FROM components_acf_sections_home_automation_edge LIMIT 5');
      console.log('\nSample components:');
      for (const comp of comps) {
        console.log(comp);
      }
    } catch (e) {
      console.log('Error checking component table:', e.message);
    }

    // Check wordpress_posts table
    console.log('\n=== wordpress_posts table columns ===');
    try {
      const [wpPostsCols] = await conn.query('SHOW COLUMNS FROM wordpress_posts');
      console.log(wpPostsCols.map(c => c.Field).join(', '));

      console.log('\n=== Sample wordpress_posts (first 3) ===');
      const [wpPosts] = await conn.query('SELECT id, title, slug, post_type, acf FROM wordpress_posts LIMIT 3');
      for (const wpPost of wpPosts) {
        console.log(`\nWordPress Post: ${wpPost.title} (${wpPost.slug})`);
        console.log('ACF:', wpPost.acf ? JSON.stringify(wpPost.acf, null, 2) : 'null');
      }

      // Check home page in wordpress_posts
      console.log('\n=== Home page from wordpress_posts ===');
      const [wpHomePage] = await conn.query('SELECT id, title, slug, acf FROM wordpress_posts WHERE slug = "home" LIMIT 1');
      if (wpHomePage.length > 0) {
        console.log('Home page ACF:', JSON.stringify(wpHomePage[0].acf, null, 2));
      }
    } catch (e) {
      console.log('Error checking wordpress_posts:', e.message);
    }

    // Check WordPress tables if they exist
    console.log('\n=== Checking for WordPress tables (qbo_ prefix) ===');
    const wpTables = tables.filter(t => Object.values(t)[0].startsWith('qbo_'));
    console.log('WP Tables found:', wpTables.map(t => Object.values(t)[0]).join(', '));

    if (wpTables.length > 0) {
      console.log('\n=== Sample qbo_posts ===');
      try {
        const [wpPosts] = await conn.query('SELECT ID, post_title, post_name, post_type FROM qbo_posts WHERE post_type = "page" LIMIT 5');
        console.log(wpPosts);
      } catch (e) {
        console.log('Error checking qbo_posts:', e.message);
      }

      console.log('\n=== Sample qbo_postmeta for home page (if any) ===');
      try {
        const [homePage] = await conn.query('SELECT ID FROM qbo_posts WHERE post_name = "home" AND post_type = "page" LIMIT 1');
        if (homePage.length > 0) {
          const [meta] = await conn.query('SELECT meta_key, meta_value FROM qbo_postmeta WHERE post_id = ?', [homePage[0].ID]);
          console.log('Meta keys found:', meta.map(m => m.meta_key));
          // Look for automation edge list
          const automationMeta = meta.filter(m => m.meta_key.includes('automation_edge'));
          console.log('Automation edge meta:', automationMeta);
        }
      } catch (e) {
        console.log('Error checking qbo_postmeta:', e.message);
      }
    }

  } finally {
    await conn.end();
  }
}

main().catch(console.error);

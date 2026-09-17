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

async function getWpPostMeta(connection, wpPostId) {
  const [metaRows] = await connection.query('SELECT meta_key, meta_value FROM qbo_postmeta WHERE post_id = ?', [wpPostId]);
  const meta = {};
  for (const row of metaRows) {
    meta[row.meta_key] = row.meta_value;
  }
  return meta;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    const wpPostId = 7417;
    const wpSlug = 'home-3';
    
    console.log(`Processing WordPress page ${wpPostId} (slug ${wpSlug})`);
    
    // Get Strapi page
    const [strapiPages] = await connection.query('SELECT id, slug FROM pages WHERE slug = ?', [wpSlug]);
    if (strapiPages.length === 0) {
      console.log('No Strapi page found');
      return;
    }
    const strapiPageId = strapiPages[0].id;
    console.log(`Found Strapi page ID ${strapiPageId}`);
    
    // Get WordPress meta
    const meta = await getWpPostMeta(connection, wpPostId);
    
    // Check all layout indices from 0 to 100
    for (let layoutIndex = 0; layoutIndex < 100; layoutIndex++) {
      const countKey = `layouts_${layoutIndex}_home_automation_edge_automation_edge_list_`;
      const count = parseInt(meta[countKey], 10);
      if (count) {
        console.log(`Found ${count} items at layout ${layoutIndex}`);
        
        // Check if page has home automation edge component
        const [pageCmps] = await connection.query('SELECT * FROM pages_cmps WHERE entity_id = ? AND component_type = "acf-sections.home-automation-edge"', [strapiPageId]);
        if (pageCmps.length === 0) {
          console.log('  No home automation edge component found');
          continue;
        }
        
        const componentId = pageCmps[0].cmp_id;
        console.log(`  Using component ID ${componentId}`);
        
        // Delete existing items
        await connection.query('DELETE FROM components_acf_sections_home_automation_edge_cmps WHERE entity_id = ? AND field = "automation_edge_list"', [componentId]);
        
        // Insert new items
        for (let i = 0; i < count; i++) {
          const item = {
            title: meta[`layouts_${layoutIndex}_home_automation_edge_automation_edge_list__${i}_title`],
            description: meta[`layouts_${layoutIndex}_home_automation_edge_automation_edge_list__${i}_description`]
          };
          console.log(`  Inserting item ${i}: ${item.title}`);
          const [insertResult] = await connection.query(
            'INSERT INTO components_acf_shared_home_automation_edge_aut_8152fc00 (title, description) VALUES (?, ?)',
            [item.title, item.description]
          );
          const itemId = insertResult.insertId;
          
          await connection.query(
            'INSERT INTO components_acf_sections_home_automation_edge_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, ?, ?, ?)',
            [componentId, itemId, 'acf-shared.home-automation-edge-automation-edge-list', 'automation_edge_list', i]
          );
        }
        
        console.log(`  Successfully migrated ${count} items`);
        break;
      }
    }
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);

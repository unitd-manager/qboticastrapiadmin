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

function unserialize(str) {
  if (typeof str !== 'string') return str;
  try {
    const result = {};
    let ptr = 0;
    const readLength = () => {
      const start = ptr;
      while (str[ptr] !== ':') ptr++;
      const len = parseInt(str.slice(start, ptr), 10);
      ptr += 2;
      return len;
    };
    const readString = (len) => {
      const val = str.slice(ptr, ptr + len);
      ptr += len + 2;
      return val;
    };
    const type = str[ptr];
    ptr += 2;
    if (type === 'a') {
      const count = readLength();
      const arr = [];
      for (let i = 0; i < count; i++) {
        const kType = str[ptr];
        ptr += 2;
        let key;
        if (kType === 's') {
          const kLen = readLength();
          key = readString(kLen);
        } else if (kType === 'i') {
          const kEnd = str.indexOf(';', ptr);
          key = parseInt(str.slice(ptr, kEnd), 10);
          ptr = kEnd + 1;
        }
        const vType = str[ptr];
        ptr += 2;
        let val;
        if (vType === 's') {
          const vLen = readLength();
          val = readString(vLen);
        } else if (vType === 'i') {
          const vEnd = str.indexOf(';', ptr);
          val = parseInt(str.slice(ptr, vEnd), 10);
          ptr = vEnd + 1;
        } else if (vType === 'a') {
          const nestedStart = ptr - 2;
          let nestedPtr = nestedStart;
          let depth = 1;
          while (depth > 0 && nestedPtr < str.length) {
            if (str[nestedPtr] === '{') depth++;
            if (str[nestedPtr] === '}') depth--;
            nestedPtr++;
          }
          const nestedStr = str.slice(nestedStart, nestedPtr);
          val = unserialize(nestedStr);
          ptr = nestedPtr;
        }
        if (typeof key === 'number') {
          arr[key] = val;
        } else {
          result[key] = val;
        }
      }
      return arr.length > 0 ? arr : result;
    }
  } catch (e) {
    return str;
  }
  return str;
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
    // Get WordPress home page
    const [wpHomePages] = await conn.query('SELECT ID FROM qbo_posts WHERE post_name = "home" AND post_type = "page" LIMIT 1');
    const wpHomePageId = wpHomePages[0].ID;

    // Get postmeta
    const [postmeta] = await conn.query('SELECT meta_key, meta_value FROM qbo_postmeta WHERE post_id = ?', [wpHomePageId]);
    const meta = {};
    for (const row of postmeta) {
      meta[row.meta_key] = row.meta_value;
    }

    // Extract items
    const count = parseInt(meta['layouts_2_home_automation_edge_automation_edge_list_'], 10);
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push({
        title: meta[`layouts_2_home_automation_edge_automation_edge_list__${i}_title`],
        description: meta[`layouts_2_home_automation_edge_automation_edge_list__${i}_description`],
      });
    }
    console.log('Items to insert:', items);

    // Get Strapi home page's home automation edge component
    const [strapiHomePages] = await conn.query('SELECT id FROM pages WHERE slug = "home" LIMIT 1');
    const strapiHomePageId = strapiHomePages[0].id;
    const [homePageCmps] = await conn.query('SELECT * FROM pages_cmps WHERE entity_id = ? AND component_type = "acf-sections.home-automation-edge"', [strapiHomePageId]);
    const componentId = homePageCmps[0].cmp_id;

    // Delete existing links
    await conn.query('DELETE FROM components_acf_sections_home_automation_edge_cmps WHERE entity_id = ? AND field = "automation_edge_list"', [componentId]);

    // Insert items and link
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const [insertResult] = await conn.query(
        'INSERT INTO components_acf_shared_home_automation_edge_aut_8152fc00 (title, description) VALUES (?, ?)',
        [item.title, item.description]
      );
      const itemId = insertResult.insertId;
      console.log('Inserted item:', itemId);
      await conn.query(
        'INSERT INTO components_acf_sections_home_automation_edge_cmps (entity_id, cmp_id, component_type, field, `order`) VALUES (?, ?, ?, ?, ?)',
        [componentId, itemId, 'acf-shared.home-automation-edge-automation-edge-list', 'automation_edge_list', i]
      );
      console.log('Linked item');
    }

    console.log('Done!');
  } finally {
    await conn.end();
  }
}

main().catch(console.error);

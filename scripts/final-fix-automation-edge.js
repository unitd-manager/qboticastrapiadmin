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
  // Basic PHP unserialize for simple arrays and strings
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
          // Recursive for nested arrays
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
    console.log('=== Step 1: Get home page from qbo_posts ===');
    const [wpHomePages] = await conn.query('SELECT ID FROM qbo_posts WHERE post_name = "home" AND post_type = "page" LIMIT 1');
    if (wpHomePages.length === 0) {
      console.log('No home page found in qbo_posts');
      return;
    }
    const wpHomePageId = wpHomePages[0].ID;
    console.log('Found WordPress home page ID:', wpHomePageId);

    console.log('\n=== Step 2: Get postmeta for home page ===');
    const [postmeta] = await conn.query('SELECT meta_key, meta_value FROM qbo_postmeta WHERE post_id = ?', [wpHomePageId]);
    const meta = {};
    for (const row of postmeta) {
      meta[row.meta_key] = row.meta_value;
    }

    console.log('\n=== Step 3: Extract automation edge list from postmeta ===');
    const automationEdgeList = [];
    const count = parseInt(meta['layouts_2_home_automation_edge_automation_edge_list_'], 10);
    console.log('Number of items:', count);

    for (let i = 0; i < count; i++) {
      const item = {};
      item.title = meta[`layouts_2_home_automation_edge_automation_edge_list__${i}_title`];
      item.description = meta[`layouts_2_home_automation_edge_automation_edge_list__${i}_description`];
      const buttonSerialized = meta[`layouts_2_home_automation_edge_automation_edge_list__${i}_button`];
      if (buttonSerialized) {
        const button = unserialize(buttonSerialized);
        item.button = {
          title: button.title,
          url: button.url,
          target: button.target,
        };
      }
      // Skip image/icon for now
      item.image = null;
      item.icon = null;
      automationEdgeList.push(item);
    }
    console.log('Extracted automation edge list:', JSON.stringify(automationEdgeList, null, 2));

    console.log('\n=== Step 4: Find Strapi home page ===');
    const [strapiHomePages] = await conn.query('SELECT id FROM pages WHERE slug = "home" LIMIT 1');
    if (strapiHomePages.length === 0) {
      console.log('No Strapi home page found');
      return;
    }
    const strapiHomePageId = strapiHomePages[0].id;
    console.log('Found Strapi home page ID:', strapiHomePageId);

    console.log('\n=== Step 5: Find home automation edge component linked to home page ===');
    const [homePageCmps] = await conn.query('SELECT * FROM pages_cmps WHERE entity_id = ? AND component_type = "acf-sections.home-automation-edge"', [strapiHomePageId]);
    console.log('Home page components:', homePageCmps);
    if (homePageCmps.length === 0) {
      console.log('No home automation edge component found on home page');
      return;
    }
    const componentId = homePageCmps[0].cmp_id;
    console.log('Found component ID:', componentId);

    console.log('\n=== Step 6: Find correct repeater and link tables ===');
    // List all tables starting with components_acf_shared_home_automation_edge
    const [sharedTables] = await conn.query('SHOW TABLES LIKE "components_acf_shared_home_automation_edge_%"');
    console.log('Shared tables:', sharedTables);
    
    // List all tables starting with components_acf_sections_home_automation_edge
    const [sectionTables] = await conn.query('SHOW TABLES LIKE "components_acf_sections_home_automation_edge_%"');
    console.log('Section tables:', sectionTables);

    // Find the repeater table and link table
    const repeaterTable = sharedTables.find(t => !Object.values(t)[0].endsWith('_cmps'));
    const linkTable = sharedTables.find(t => Object.values(t)[0].endsWith('_cmps'));
    
    if (!repeaterTable) {
      console.log('No repeater table found');
      return;
    }
    const repeaterTableName = Object.values(repeaterTable)[0];
    console.log('Repeater table:', repeaterTableName);
    
    if (!linkTable) {
      console.log('No link table found');
      return;
    }
    const linkTableActualName = Object.values(linkTable)[0];
    console.log('Link table:', linkTableActualName);

    // Check their columns
    const [repeaterCols] = await conn.query('SHOW COLUMNS FROM ??', [repeaterTableName]);
    console.log('Repeater columns:', repeaterCols.map(c => c.Field).join(', '));
    
    const [linkCols] = await conn.query('SHOW COLUMNS FROM ??', [linkTableActualName]);
    console.log('Link table columns:', linkCols.map(c => c.Field).join(', '));

    // First, delete existing items if any
    const compFkCol = linkCols.find(c => c.Field.includes('home_automation_edge')).Field;
    await conn.query('DELETE FROM ?? WHERE ?? = ?', [linkTableActualName, compFkCol, componentId]);

    // Insert new items
    for (let i = 0; i < automationEdgeList.length; i++) {
      const item = automationEdgeList[i];
      // Insert into repeater table
      const insertData = {};
      for (const col of repeaterCols) {
        if (col.Field === 'title') insertData.title = item.title;
        if (col.Field === 'description') insertData.description = item.description;
        if (col.Field === 'button_title') insertData.button_title = item.button?.title || null;
        if (col.Field === 'button_url') insertData.button_url = item.button?.url || null;
        if (col.Field === 'button_target') insertData.button_target = item.button?.target || null;
        if (col.Field === 'image') insertData.image = item.image;
        if (col.Field === 'icon') insertData.icon = item.icon;
      }
      const columns = Object.keys(insertData);
      const values = Object.values(insertData);
      const placeholders = columns.map(() => '?').join(', ');
      const [insertResult] = await conn.query(
        `INSERT INTO ?? (${columns.join(', ')}) VALUES (${placeholders})`,
        [repeaterTableName, ...values]
      );
      const itemId = insertResult.insertId;
      
      // Insert into link table
      const linkData = {};
      for (const col of linkCols) {
        if (col.Field === compFkCol) linkData[col.Field] = componentId;
        if (col.Field === 'component_id') linkData.component_id = itemId;
        if (col.Field === 'order') linkData.order = i;
      }
      const linkColumns = Object.keys(linkData);
      const linkValues = Object.values(linkData);
      const linkPlaceholders = linkColumns.map(() => '?').join(', ');
      await conn.query(
        `INSERT INTO ?? (${linkColumns.join(', ')}) VALUES (${linkPlaceholders})`,
        [linkTableActualName, ...linkValues]
      );
      console.log('Inserted item', i, 'with ID', itemId);
    }

    console.log('\n=== Done! ===');
  } finally {
    await conn.end();
  }
}

main().catch(console.error);

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
    const [tables] = await conn.query("SHOW TABLES LIKE 'components_acf_shared_home_automation_edge%'");
    console.log('Automation edge tables:');
    tables.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(tableName);
    });
    const [cols] = await conn.query('DESCRIBE components_acf_shared_home_automation_edge_aut_8152fc00');
    console.log('\nAutomation edge item table columns:');
    console.table(cols);
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
#!/usr/bin/env node
'use strict';

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
    process.env[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME,
  });

  try {
    const [filesTables] = await connection.query("SHOW TABLES LIKE 'files%'");
    console.log('files* tables:');
    for (const row of filesTables) {
      const tableName = Object.values(row)[0];
      console.log('-', tableName);
      const [cols] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
      for (const col of cols) {
        console.log(`  ${col.Field} :: ${col.Type}`);
      }
    }

    const [relatedTables] = await connection.query("SHOW TABLES LIKE '%related%'");
    console.log('\n%related% tables:');
    for (const row of relatedTables) {
      console.log('-', Object.values(row)[0]);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

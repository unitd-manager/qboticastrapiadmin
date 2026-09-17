/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const parseEnvFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^['\"]|['\"]$/g, '');
    env[key] = value;
  }

  return env;
};

async function run() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file not found in project root.');
  }

  const env = parseEnvFile(envPath);
  const client = env.DATABASE_CLIENT || 'mysql';

  if (!['mysql', 'mysql2'].includes(client)) {
    throw new Error(`This script currently supports MySQL only. Found DATABASE_CLIENT=${client}`);
  }

  const connection = await mysql.createConnection({
    host: env.DATABASE_HOST || '127.0.0.1',
    port: Number(env.DATABASE_PORT || 3306),
    user: env.DATABASE_USERNAME || env.DATABASE_USER || 'root',
    password: env.DATABASE_PASSWORD || '',
    database: env.DATABASE_NAME,
    connectTimeout: Number(env.DATABASE_CONNECT_TIMEOUT || env.DATABASE_CONNECTION_TIMEOUT || 60000),
  });

  try {
    const [columns] = await connection.query("SHOW COLUMNS FROM `pages` LIKE 'published_at'");
    const hasPublishedAt = Array.isArray(columns) && columns.length > 0;
    const selectPublishedAt = hasPublishedAt ? ', `published_at`' : '';

    const [indexes] = await connection.query('SHOW INDEX FROM `pages`');
    console.log('Existing indexes on pages table:');
    console.table(indexes);

    const [rows] = await connection.query(
      `EXPLAIN SELECT id, title, slug, updated_at${selectPublishedAt} FROM pages ORDER BY updated_at DESC LIMIT 25`
    );

    console.log('EXPLAIN output for admin Pages list query:');
    console.table(rows);
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('Failed to run EXPLAIN:', error.message || error);
  process.exitCode = 1;
});

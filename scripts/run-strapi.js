#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch {}
}

function resolveStrapiBin() {
  try {
    return require.resolve('@strapi/strapi/bin/strapi.js', { paths: [ROOT] });
  } catch {
    return path.join(ROOT, 'node_modules', '@strapi', 'strapi', 'bin', 'strapi.js');
  }
}

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  process.stderr.write('Usage: node scripts/run-strapi.js <command> [args...]\n');
  process.exit(1);
}

if (!process.env.XDG_CONFIG_HOME) {
  const configHome = path.join(ROOT, '.strapi-config');
  ensureDir(configHome);
  process.env.XDG_CONFIG_HOME = configHome;
}

const binPath = resolveStrapiBin();
const child = spawn(process.execPath, [binPath, command, ...args], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

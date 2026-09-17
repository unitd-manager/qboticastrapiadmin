#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');

const scriptPath = path.join(__dirname, 'migrate-wordpress-to-strapi.js');

const args = process.argv.slice(2);
const env = { ...process.env };

// Defaults: only migrate posts and skip existing entries (create-only behavior)
env.MIGRATE_TYPES = env.MIGRATE_TYPES || 'posts';
env.SKIP_EXISTING = env.SKIP_EXISTING !== undefined ? env.SKIP_EXISTING : 'true';

// CLI flags to override behavior
// --force  => set SKIP_EXISTING=false (allow creates and updates)
// --write  => set DRY_RUN=false (perform writes)
// --dry-run => set DRY_RUN=true
if (args.includes('--force')) {
  env.SKIP_EXISTING = 'false';
}

if (args.includes('--write')) {
  env.DRY_RUN = 'false';
} else if (args.includes('--dry-run')) {
  env.DRY_RUN = 'true';
}

// Update flags: opt-in to update existing posts' fields
// --update-featured => set UPDATE_EXISTING_FEATURED_IMAGE=true
// --update-content  => set UPDATE_EXISTING_CONTENT=true
// --update          => set both
if (args.includes('--update') || args.includes('--update-featured')) {
  env.UPDATE_EXISTING_FEATURED_IMAGE = 'true';
}

if (args.includes('--update') || args.includes('--update-content')) {
  env.UPDATE_EXISTING_CONTENT = 'true';
}

// If any update flag is present ensure we allow updates (don't skip existing)
if (env.UPDATE_EXISTING_FEATURED_IMAGE === 'true' || env.UPDATE_EXISTING_CONTENT === 'true') {
  env.SKIP_EXISTING = 'false';
}

console.log(`Running posts-only migration with MIGRATE_TYPES=${env.MIGRATE_TYPES}, SKIP_EXISTING=${env.SKIP_EXISTING}, DRY_RUN=${env.DRY_RUN}`);

const result = spawnSync(process.execPath, [scriptPath], {
  env,
  stdio: 'inherit',
});

process.exit(result.status || 0);

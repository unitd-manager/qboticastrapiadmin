const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SCHEMA_DIRS = [
  path.join(ROOT, 'src', 'api'),
  path.join(ROOT, 'src', 'components'),
];
const BACKUP_DIR = path.join(ROOT, 'backups', 'field-label-schemas');

let updated = 0;
let skipped = 0;

function toTitleCaseLabel(fieldName) {
  return String(fieldName)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function walk(directory, callback) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, callback);
    } else if (entry.name === 'schema.json' || fullPath.includes(path.join('src', 'components'))) {
      if (fullPath.endsWith('.json')) {
        callback(fullPath);
      }
    }
  }
}

function processSchema(filePath) {
  let schema;

  try {
    schema = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Invalid JSON: ${filePath}`);
    console.error(error.message);
    skipped++;
    return;
  }

  if (!schema.attributes || typeof schema.attributes !== 'object') {
    skipped++;
    return;
  }

  let changed = false;

  for (const [fieldName, attribute] of Object.entries(schema.attributes)) {
    if (!attribute || typeof attribute !== 'object') continue;

    const label = toTitleCaseLabel(fieldName);
    const existing = attribute.metadatas || {};

    if (existing.label !== label) {
      attribute.metadatas = {
        ...existing,
        label,
      };
      changed = true;
    }
  }

  if (!changed) {
    skipped++;
    return;
  }

  const relativePath = path.relative(ROOT, filePath);
  const backupPath = path.join(BACKUP_DIR, relativePath);

  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);

  fs.writeFileSync(filePath, JSON.stringify(schema, null, 2) + '\n', 'utf8');

  updated++;
  console.log(`Updated: ${relativePath}`);
}

for (const directory of SCHEMA_DIRS) {
  walk(directory, processSchema);
}

console.log('');
console.log(`Schemas updated: ${updated}`);
console.log(`Schemas skipped: ${skipped}`);
console.log('Label conversion finished.');

#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGE_SCHEMA_PATH = path.join(ROOT, 'src', 'api', 'page', 'content-types', 'page', 'schema.json');
const MANIFEST_PATH = path.join(ROOT, 'scripts', 'generated', 'acf-page-builder-manifest.json');
const SECTION_CATEGORY = 'acf-sections';
const NESTED_CATEGORY = 'acf-shared';
const SECTION_DIR = path.join(ROOT, 'src', 'components', SECTION_CATEGORY);
const NESTED_DIR = path.join(ROOT, 'src', 'components', NESTED_CATEGORY);
const RESERVED_ATTRIBUTE_NAMES = new Set([
  'id',
  'documentId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'locale',
  'localizations',
]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function slugify(value, fallback = 'item') {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function attributeKey(value, fallback = 'field') {
  const normalized = String(value || fallback)
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const safe = normalized || fallback;
  const prefixed = /^\d/.test(safe) ? `field_${safe}` : safe;
  return RESERVED_ATTRIBUTE_NAMES.has(prefixed) ? `acf_${prefixed}` : prefixed;
}

function humanize(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function shortenWithHash(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  const hash = crypto.createHash('md5').update(value).digest('hex').slice(0, 8);
  return `${value.slice(0, maxLength - 9)}-${hash}`;
}

function buildCollectionName(category, slug) {
  const base = `components_${category.replace(/-/g, '_')}_${slug.replace(/-/g, '_')}`;
  if (base.length <= 55) {
    return base;
  }

  const hash = crypto.createHash('md5').update(base).digest('hex').slice(0, 8);
  return `${base.slice(0, 46)}_${hash}`;
}

function hasChoices(field) {
  return field && field.choices && typeof field.choices === 'object' && Object.keys(field.choices).length > 0;
}

function supportsMultiple(field) {
  return [1, true, '1', 'true'].includes(field?.multiple);
}

function allowsCustomChoice(field) {
  return [1, true, '1', 'true'].includes(field?.allow_custom || field?.create_options || field?.save_options);
}

function isDecimalField(field) {
  const step = Number(field?.step);
  return Number.isFinite(step) && !Number.isInteger(step);
}

function cleanDescription(field) {
  const instructions = String(field?.instructions || '').trim();
  return instructions || undefined;
}

function setMeta(attribute, field) {
  if (field?.required === 1) {
    attribute.required = true;
  }

  const description = cleanDescription(field);
  if (description) {
    attribute.description = description;
  }

  return attribute;
}

function ensureUniqueKey(baseKey, takenKeys) {
  let key = baseKey;
  let counter = 2;

  while (takenKeys.has(key)) {
    key = `${baseKey}_${counter}`;
    counter += 1;
  }

  takenKeys.add(key);
  return key;
}

function createGenerator(layoutGroups) {
  const writtenComponents = new Set();
  const layoutUidMap = new Map();
  fs.mkdirSync(SECTION_DIR, { recursive: true });
  fs.mkdirSync(NESTED_DIR, { recursive: true });

  function writeComponent({ category, dir, slug, displayName, attributes }) {
    const uid = `${category}.${slug}`;
    if (writtenComponents.has(uid)) {
      return uid;
    }

    writeJson(path.join(dir, `${slug}.json`), {
      collectionName: buildCollectionName(category, slug),
      info: {
        displayName,
      },
      attributes,
    });

    writtenComponents.add(uid);
    return uid;
  }

  function buildAttributes(fields, contextParts, parentLabel) {
    const attributes = {};
    const usedKeys = new Set();

    for (const field of fields || []) {
      if (!field || !field.name) {
        continue;
      }

      const fallbackName = slugify(field.label || field.key || 'field', 'field').replace(/-/g, '_');
      const key = ensureUniqueKey(attributeKey(field.name, fallbackName), usedKeys);
      const attribute = buildAttribute(field, [...contextParts, slugify(field.name, 'field')], parentLabel);

      if (attribute) {
        attributes[key] = attribute;
      }
    }

    return attributes;
  }

  function buildNestedComponent(field, contextParts, parentLabel) {
    const leafSlug = shortenWithHash(contextParts.join('-'), 80);
    const displayName = `${parentLabel} ${field.label || humanize(field.name)}`.trim();
    const attributes = buildAttributes(field.sub_fields || [], contextParts, displayName);

    return writeComponent({
      category: NESTED_CATEGORY,
      dir: NESTED_DIR,
      slug: leafSlug,
      displayName,
      attributes: Object.keys(attributes).length > 0 ? attributes : { value: { type: 'json' } },
    });
  }

  function buildAttribute(field, contextParts, parentLabel) {
    const type = String(field.type || '').trim();

    if (!type) {
      return null;
    }

    if (type === 'tab' || type === 'accordion' || type === 'message') {
      return null;
    }

    if (type === 'text') {
      return setMeta({ type: 'string' }, field);
    }

    if (type === 'textarea') {
      return setMeta({ type: 'text' }, field);
    }

    if (type === 'wysiwyg') {
      return setMeta({ type: 'richtext' }, field);
    }

    if (type === 'number' || type === 'range') {
      return setMeta({ type: isDecimalField(field) ? 'decimal' : 'integer' }, field);
    }

    if (type === 'true_false') {
      return setMeta({ type: 'boolean' }, field);
    }

    if (type === 'color_picker' || type === 'url' || type === 'email' || type === 'date_picker' || type === 'date_time_picker' || type === 'time_picker') {
      return setMeta({ type: 'string' }, field);
    }

    if (type === 'image') {
      return setMeta({ type: 'media', multiple: false, allowedTypes: ['images'] }, field);
    }

    if (type === 'gallery') {
      return setMeta({ type: 'media', multiple: true, allowedTypes: ['images'] }, field);
    }

    if (type === 'file') {
      return setMeta({ type: 'media', multiple: false }, field);
    }

    if (type === 'link') {
      return setMeta({ type: 'component', component: 'shared.menu-item', repeatable: false }, field);
    }

    if (type === 'radio' || type === 'button_group') {
      if (hasChoices(field) && !allowsCustomChoice(field)) {
        return setMeta({ type: 'enumeration', enum: Object.keys(field.choices) }, field);
      }

      return setMeta({ type: 'json' }, field);
    }

    if (type === 'select') {
      if (hasChoices(field) && !supportsMultiple(field) && !allowsCustomChoice(field)) {
        return setMeta({ type: 'enumeration', enum: Object.keys(field.choices) }, field);
      }

      return setMeta({ type: 'json' }, field);
    }

    if (type === 'checkbox') {
      return setMeta({ type: 'json' }, field);
    }

    if (type === 'group') {
      const component = buildNestedComponent(field, contextParts, parentLabel);
      return setMeta({ type: 'component', repeatable: false, component }, field);
    }

    if (type === 'repeater' || type === 'flexible_content') {
      const component = buildNestedComponent(field, contextParts, parentLabel);
      return setMeta({ type: 'component', repeatable: true, component }, field);
    }

    return setMeta({ type: 'json' }, field);
  }

  function buildSectionComponents() {
    const sectionUids = [];

    for (const layout of layoutGroups) {
      const slug = shortenWithHash(slugify(layout.name), 80);
      const attributes = buildAttributes(layout.sub_fields || [], [slug], layout.label || humanize(layout.name));
      const uid = writeComponent({
        category: SECTION_CATEGORY,
        dir: SECTION_DIR,
        slug,
        displayName: layout.label || humanize(layout.name),
        attributes,
      });

      layoutUidMap.set(layout.name, uid);
      sectionUids.push(uid);
    }

    return sectionUids;
  }

  return {
    buildSectionComponents,
    getLayoutUidMap: () => layoutUidMap,
    getWrittenCount: () => writtenComponents.size,
  };
}

function isLayoutContainerField(field) {
  if (!field || !['repeater', 'flexible_content'].includes(String(field.type || '').trim())) {
    return false;
  }

  const subFields = Array.isArray(field.sub_fields) ? field.sub_fields : [];
  const hasLayoutType = subFields.some((subField) => subField?.name === 'layout_type');
  const hasLayoutGroups = subFields.some(
    (subField) => subField?.type === 'group' && subField?.name && subField.name !== 'layout_type'
  );

  return hasLayoutType && hasLayoutGroups;
}

function extractLayoutGroups(exportJson) {
  if (!Array.isArray(exportJson)) {
    return [];
  }

  const containers = [];

  for (const entry of exportJson) {
    for (const field of Array.isArray(entry?.fields) ? entry.fields : []) {
      if (!isLayoutContainerField(field)) {
        continue;
      }

      containers.push({
        groupTitle: entry.title || null,
        fieldName: field.name || null,
        fieldLabel: field.label || null,
        layoutGroups: (field.sub_fields || []).filter(
          (subField) => subField.type === 'group' && subField.name && subField.name !== 'layout_type'
        ),
      });
    }
  }

  return containers;
}

function mergeLayoutGroups(existingGroups, nextGroups) {
  const merged = new Map();

  for (const layout of existingGroups || []) {
    if (layout?.name) {
      merged.set(layout.name, layout);
    }
  }

  for (const layout of nextGroups || []) {
    if (layout?.name) {
      merged.set(layout.name, layout);
    }
  }

  return [...merged.values()];
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    fail('Usage: node scripts/generate-acf-page-builder.js <path-to-acf-export.json>');
  }

  if (!fs.existsSync(inputPath)) {
    fail(`Input file not found: ${inputPath}`);
  }

  const exportJson = readJson(inputPath);
  const layoutContainers = extractLayoutGroups(exportJson);
  if (layoutContainers.length === 0) {
    fail('Could not find any page-builder field groups containing a layout_type field.');
  }

  const extractedLayoutGroups = layoutContainers.flatMap((container) => container.layoutGroups);
  const existingManifest = fs.existsSync(MANIFEST_PATH) ? readJson(MANIFEST_PATH) : null;
  const layoutGroups = mergeLayoutGroups(existingManifest?.layoutGroups || [], extractedLayoutGroups);

  if (layoutGroups.length === 0) {
    fail('No layout groups were found in the provided ACF export.');
  }

  const generator = createGenerator(layoutGroups);
  const sectionUids = generator.buildSectionComponents();

  writeJson(MANIFEST_PATH, {
    generatedAt: new Date().toISOString(),
    sourceFile: inputPath,
    sectionCategory: SECTION_CATEGORY,
    nestedCategory: NESTED_CATEGORY,
    layoutGroups,
  });

  const pageSchema = readJson(PAGE_SCHEMA_PATH);
  const existingComponents = Array.isArray(pageSchema?.attributes?.pageBuilder?.components)
    ? pageSchema.attributes.pageBuilder.components
    : [];

  pageSchema.attributes.pageBuilder.components = [...new Set([...existingComponents, ...sectionUids])];
  writeJson(PAGE_SCHEMA_PATH, pageSchema);

  console.log(
    JSON.stringify(
      {
        containers: layoutContainers.map((container) => ({
          groupTitle: container.groupTitle,
          fieldName: container.fieldName,
          layouts: container.layoutGroups.length,
        })),
        layouts: layoutGroups.length,
        generatedComponents: generator.getWrittenCount(),
        pageBuilderComponents: pageSchema.attributes.pageBuilder.components.length,
      },
      null,
      2
    )
  );
}

main();

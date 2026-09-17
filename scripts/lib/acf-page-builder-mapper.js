const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_MANIFEST_PATH = path.join(ROOT, 'scripts', 'generated', 'acf-page-builder-manifest.json');
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
  throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function slugify(value, fallback = 'item') {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function shortenWithHash(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(value).digest('hex').slice(0, 8);
  return `${value.slice(0, maxLength - 9)}-${hash}`;
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

function pickDefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return true;
}

function normalizeLayoutKey(key) {
  return String(key || '')
    .replace(/__+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function chooseBestLayoutPrefix(candidates) {
  return [...candidates.entries()]
    .map(([prefix, layouts]) => ({
      prefix,
      layouts,
      typedCount: layouts.filter((layout) => layout.type).length,
      fieldCount: layouts.reduce((total, layout) => total + Object.keys(layout.fields || {}).length, 0),
      prefixWeight:
        prefix === 'layouts' ? 3 :
        prefix.endsWith('_layouts') ? 2 :
        prefix.includes('layout') ? 1 : 0,
    }))
    .filter((candidate) => candidate.typedCount > 0)
    .sort((left, right) => {
      if (right.typedCount !== left.typedCount) {
        return right.typedCount - left.typedCount;
      }

      if (right.fieldCount !== left.fieldCount) {
        return right.fieldCount - left.fieldCount;
      }

      if (right.prefixWeight !== left.prefixWeight) {
        return right.prefixWeight - left.prefixWeight;
      }

      return left.prefix.localeCompare(right.prefix);
    })[0];
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function firstMeaningful(...values) {
  return values.find(isMeaningfulValue);
}

function normalizePostCountFieldValue(fieldName, numericValue) {
  if (!Number.isFinite(numericValue)) {
    return numericValue;
  }

  const normalizedFieldName = String(fieldName || '').toLowerCase();
  const shouldClamp =
    normalizedFieldName === 'post_per_page' ||
    normalizedFieldName === 'posts_limit' ||
    normalizedFieldName === 'post_count' ||
    normalizedFieldName === 'related_post_count';

  if (!shouldClamp) {
    return numericValue;
  }

  return Math.max(1, Math.min(5, numericValue));
}

function sanitizePlainText(value) {
  if (!isMeaningfulValue(value)) {
    return undefined;
  }

  return String(value).replace(/\r\n/g, '\n').trim();
}

function sanitizeShortText(value, maxLength = 255) {
  const sanitized = sanitizePlainText(value);
  if (!sanitized) {
    return undefined;
  }

  const plain = String(sanitized)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plain) {
    return undefined;
  }

  return plain.length > maxLength ? plain.slice(0, maxLength) : plain;
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

function normalizeNumber(value, allowDecimal = false) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return allowDecimal ? parsed : Math.trunc(parsed);
}

function looksLikePhpSerialized(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  return /^(a|s|i|d|b|N):/.test(trimmed);
}

function parsePhpSerialized(value) {
  const input = String(value || '').trim();
  let index = 0;

  function parseValue() {
    const type = input[index];
    index += 2;

    if (type === 'N') {
      if (input[index] === ';') {
        index += 1;
      }
      return null;
    }

    if (type === 'b' || type === 'i' || type === 'd') {
      const end = input.indexOf(';', index);
      if (end === -1) {
        throw new Error('Invalid serialized scalar');
      }

      const raw = input.slice(index, end);
      index = end + 1;

      if (type === 'b') {
        return raw === '1';
      }

      return Number(raw);
    }

    if (type === 's') {
      const lengthEnd = input.indexOf(':', index);
      if (lengthEnd === -1) {
        throw new Error('Invalid serialized string length');
      }

      const expectedLength = Number(input.slice(index, lengthEnd));
      index = lengthEnd + 2;

      let end = index;
      let byteLength = 0;
      while (end < input.length && byteLength < expectedLength) {
        byteLength += Buffer.byteLength(input[end], 'utf8');
        end += 1;
      }

      const result = input.slice(index, end);
      index = end;

      if (input.slice(index, index + 2) !== '";') {
        throw new Error('Invalid serialized string terminator');
      }

      index += 2;
      return result;
    }

    if (type === 'a') {
      const lengthEnd = input.indexOf(':', index);
      if (lengthEnd === -1) {
        throw new Error('Invalid serialized array length');
      }

      const size = Number(input.slice(index, lengthEnd));
      index = lengthEnd + 2;

      const entries = [];
      for (let count = 0; count < size; count += 1) {
        const key = parseValue();
        const entryValue = parseValue();
        entries.push([key, entryValue]);
      }

      if (input[index] !== '}') {
        throw new Error('Invalid serialized array terminator');
      }

      index += 1;

      const isSequential = entries.every(([key], entryIndex) => key === entryIndex);
      if (isSequential) {
        return entries.map(([, entryValue]) => entryValue);
      }

      return Object.fromEntries(entries.map(([key, entryValue]) => [String(key), entryValue]));
    }

    throw new Error(`Unsupported serialized type: ${type}`);
  }

  const parsed = parseValue();
  if (index !== input.length) {
    throw new Error('Unexpected trailing serialized data');
  }

  return parsed;
}

function normalizeSerializedValue(value) {
  if (!looksLikePhpSerialized(value)) {
    return value;
  }

  try {
    return parsePhpSerialized(value);
  } catch {
    return value;
  }
}

function findValue(source, fieldName) {
  if (!isPlainObject(source)) {
    return undefined;
  }

  if (isMeaningfulValue(source[fieldName])) {
    return source[fieldName];
  }

  const entries = Object.entries(source);
  const exactMatch = entries.find(([key, value]) => key === fieldName && isMeaningfulValue(value));
  if (exactMatch) {
    return exactMatch[1];
  }

  const suffixMatch = entries.find(
    ([key, value]) => (key.endsWith(`_${fieldName}`) || key.includes(`${fieldName}_`)) && isMeaningfulValue(value)
  );

  return suffixMatch ? suffixMatch[1] : undefined;
}

function buildScopedSource(source, fieldName) {
  const scoped = {};

  if (isPlainObject(source?.[fieldName])) {
    Object.assign(scoped, source[fieldName]);
  }

  for (const [key, value] of Object.entries(source || {})) {
    if (key.startsWith(`${fieldName}_`)) {
      scoped[key.slice(fieldName.length + 1)] = value;
    }
  }

  return scoped;
}

function buildRepeaterItemSources(source, fieldName) {
  const directValue = source?.[fieldName];

  if (Array.isArray(directValue)) {
    return directValue.filter((item) => isPlainObject(item) || Array.isArray(item) || isMeaningfulValue(item));
  }

  if (isPlainObject(directValue)) {
    const numericKeys = Object.keys(directValue).filter((key) => /^\d+$/.test(key));
    if (numericKeys.length > 0) {
      return numericKeys
        .sort((left, right) => Number(left) - Number(right))
        .map((key) => directValue[key]);
    }
  }

  const matcher = new RegExp(`^${escapeRegex(fieldName)}_+(\\d+)_(.+)$`);
  const items = new Map();

  for (const [key, value] of Object.entries(source || {})) {
    const match = key.match(matcher);
    if (!match) {
      continue;
    }

    const index = Number(match[1]);
    const childKey = match[2];
    const item = items.get(index) || {};
    item[childKey] = value;
    items.set(index, item);
  }

  return [...items.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, item]) => item);
}

function buildSectionSpacePaddingField() {
  return {
    name: 'section_space_padding',
    type: 'group',
    sub_fields: [
      {
        name: 'padding_options',
        type: 'true_false',
      },
      {
        name: 'padding_position',
        type: 'checkbox',
      },
      {
        name: 'desktop_padding',
        type: 'group',
        sub_fields: [
          {
            name: 'padding_top_desktop',
            type: 'range',
          },
          {
            name: 'padding_bottom_desktop',
            type: 'range',
          },
        ],
      },
      {
        name: 'mobile_padding',
        type: 'group',
        sub_fields: [
          {
            name: 'padding_top_mobile',
            type: 'range',
          },
          {
            name: 'padding_bottom_mobile',
            type: 'range',
          },
        ],
      },
    ],
  };
}

function buildMenuItem(value) {
  if (!isMeaningfulValue(value)) {
    return undefined;
  }

  const normalizedValue = normalizeSerializedValue(value);

  if (isPlainObject(normalizedValue)) {
    value = normalizedValue;
  } else if (normalizedValue !== value) {
    value = normalizedValue;
  }

  if (typeof value === 'string') {
    return {
      label: 'Learn More',
      url: value,
      targetBlank: false,
    };
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  const normalizedNestedLink = normalizeSerializedValue(firstMeaningful(value.url, value.link, value.href));
  const nestedLinkObject = isPlainObject(normalizedNestedLink) ? normalizedNestedLink : null;
  const url = nestedLinkObject
    ? firstMeaningful(nestedLinkObject.url, nestedLinkObject.link, nestedLinkObject.href)
    : normalizedNestedLink;

  if (!isMeaningfulValue(url)) {
    return undefined;
  }

  return {
    label:
      sanitizeShortText(
        firstMeaningful(
          value.title,
          value.label,
          value.text,
          nestedLinkObject?.title,
          nestedLinkObject?.label,
          nestedLinkObject?.text,
          'Learn More'
        ),
        255
      ) || 'Learn More',
    url: String(url),
    targetBlank: ['_blank', 'blank', true, '1', 1].includes(firstMeaningful(value.target, nestedLinkObject?.target)),
  };
}

function getMediaReference(entry) {
  if (!entry) {
    return null;
  }

  return {
    id: entry.id,
    documentId: entry.documentId,
    name: entry.name,
    alternativeText:
      entry.alternativeText ||
      entry.name ||
      '',
    caption: entry.caption || '',
    mime: entry.mime,
    width: entry.width,
    height: entry.height,
    url: entry.url,
    formats: entry.formats || null,
  };
}
async function resolveSingleMediaValue(value, tools = {}) {
  if (!isMeaningfulValue(value)) {
    return undefined;
  }

  if (typeof value === 'number') {
    const uploaded = await tools.uploadAttachmentId?.(value);
    return uploaded ? (tools.getMediaReference || getMediaReference)(uploaded) : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    if (/^\d+$/.test(trimmed)) {
      const uploaded = await tools.uploadAttachmentId?.(Number(trimmed));
      return uploaded ? (tools.getMediaReference || getMediaReference)(uploaded) : undefined;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      const uploaded = await tools.uploadRemoteUrl?.(trimmed);
      return uploaded ? (tools.getMediaReference || getMediaReference)(uploaded) : undefined;
    }

    return undefined;
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  const attachmentId = firstMeaningful(value.id, value.ID, value.attachment_id);
  if (attachmentId !== undefined && attachmentId !== null && String(attachmentId).trim() !== '') {
    const normalizedId = Number(attachmentId);
    if (Number.isFinite(normalizedId) && normalizedId > 0) {
      const uploaded = await tools.uploadAttachmentId?.(normalizedId);
      return uploaded ? (tools.getMediaReference || getMediaReference)(uploaded) : undefined;
    }
  }

  const remoteUrl = firstMeaningful(
    value.url,
    value.guid,
    value.src,
    value.link,
    value.file,
    value.sizes?.full,
    value.sizes?.large,
    value.sizes?.medium
  );
  if (remoteUrl) {
    const filename = firstMeaningful(value.filename, value.name, value.title);
    const uploaded = await tools.uploadRemoteUrl?.(String(remoteUrl), filename ? String(filename) : undefined);
    return uploaded ? (tools.getMediaReference || getMediaReference)(uploaded) : undefined;
  }

  return undefined;
}

async function resolveMediaValue(value, multiple, tools) {
  if (!multiple) {
    return resolveSingleMediaValue(value, tools);
  }

  const items = Array.isArray(value) ? value : [value];
  const resolved = [];

  for (const item of items) {
    const reference = await resolveSingleMediaValue(item, tools);
    if (reference !== undefined) {
      resolved.push(reference);
    }
  }

  return resolved.length > 0 ? resolved : undefined;
}

async function mapField(field, source, tools, contextParts) {
  const type = String(field?.type || '').trim();
  if (!type || type === 'tab' || type === 'accordion' || type === 'message') {
    return undefined;
  }

  const value = findValue(source, field.name);

  if (type === 'group') {
    const scopedSource = buildScopedSource(source, field.name);
    if (!isMeaningfulValue(scopedSource)) {
      return undefined;
    }

    const mapped = await mapFields(field.sub_fields || [], scopedSource, tools, [...contextParts, slugify(field.name, 'field')]);
    return isMeaningfulValue(mapped) ? mapped : undefined;
  }

  if (type === 'repeater' || type === 'flexible_content') {
    const items = buildRepeaterItemSources(source, field.name);
    if (items.length === 0) {
      return undefined;
    }

    const mappedItems = [];
    for (const itemSource of items) {
      if (type === 'flexible_content' && Array.isArray(field.layouts) && field.layouts.length > 0) {
        mappedItems.push(itemSource);
        continue;
      }

      const mapped = await mapFields(
        field.sub_fields || [],
        isPlainObject(itemSource) ? itemSource : { value: itemSource },
        tools,
        [...contextParts, slugify(field.name, 'field')]
      );
      if (isMeaningfulValue(mapped)) {
        mappedItems.push(mapped);
      }
    }

    return mappedItems.length > 0 ? mappedItems : undefined;
  }

  if (!isMeaningfulValue(value)) {
    return undefined;
  }

  if (type === 'text') {
    return sanitizeShortText(value, 255) || sanitizePlainText(value);
  }

  if (type === 'textarea' || type === 'wysiwyg') {
    return sanitizePlainText(value);
  }

  if (type === 'number') {
    const normalizedNumber = normalizeNumber(value, false);
    return normalizePostCountFieldValue(field?.name, normalizedNumber);
  }

  if (type === 'range') {
    const normalizedRange = normalizeNumber(value, String(field?.step || '').includes('.'));
    return normalizePostCountFieldValue(field?.name, normalizedRange);
  }

  if (type === 'post_object') {
    const normalized = normalizeSerializedValue(value);

    if (Array.isArray(normalized)) {
      if (normalized.length === 0) {
        return undefined;
      }

      const first = normalized[0];
      if (isPlainObject(first)) {
        const firstId = firstMeaningful(first.ID, first.id, first.post_name, first.title);
        return isMeaningfulValue(firstId) ? String(firstId) : undefined;
      }

      return String(first);
    }

    if (isPlainObject(normalized)) {
      const objectId = firstMeaningful(normalized.ID, normalized.id, normalized.post_name, normalized.title);
      return isMeaningfulValue(objectId) ? String(objectId) : undefined;
    }

    return isMeaningfulValue(normalized) ? String(normalized) : undefined;
  }

  if (type === 'true_false') {
    return normalizeBoolean(value);
  }

  if (type === 'link') {
    return buildMenuItem(value);
  }

  if (type === 'image') {
    return resolveMediaValue(value, false, tools);
  }

  if (type === 'gallery') {
    return resolveMediaValue(value, true, tools);
  }

  if (type === 'file') {
    return resolveMediaValue(value, false, tools);
  }

  if (type === 'checkbox') {
    const normalizedValue = normalizeSerializedValue(value);
    if (field?.name === 'padding_position') {
      const selectedValues = Array.isArray(normalizedValue)
        ? normalizedValue
        : isMeaningfulValue(normalizedValue)
          ? [normalizedValue]
          : [];

      return {
        top: selectedValues.includes('top'),
        bottom: selectedValues.includes('bottom'),
      };
    }

    return Array.isArray(normalizedValue) || isPlainObject(normalizedValue) ? normalizedValue : [normalizedValue];
  }

  if (['select', 'radio', 'button_group'].includes(type)) {
    const normalized = normalizeSerializedValue(value);
    if (Array.isArray(normalized) && normalized.length === 1) {
      return normalized[0];
    }

    return normalized;
  }

  return normalizeSerializedValue(value);
}

async function mapFields(fields, source, tools, contextParts) {
  const result = {};

  for (const field of fields || []) {
    if (!field?.name) {
      continue;
    }

    const mappedValue = await mapField(field, source, tools, contextParts);
    if (mappedValue !== undefined) {
      result[attributeKey(field.name, slugify(field.label || field.key || 'field', 'field').replace(/-/g, '_'))] = mappedValue;
    }
  }

  return result;
}

function buildFlexibleLayouts(acf) {
  if (!acf || typeof acf !== 'object') {
    return [];
  }

  if (Array.isArray(acf.layouts)) {
    return acf.layouts
      .map((layout, index) => ({
        index,
        type: String(layout?.layout_type || layout?.type || '').trim(),
        fields: layout && typeof layout === 'object' ? layout : {},
      }))
      .filter((layout) => layout.type);
  }

  const candidatePrefixes = new Map();

  for (const [rawKey, value] of Object.entries(acf)) {
    const match = rawKey.match(/^(.+?)_(\d+)_(.+)$/);
    if (!match) {
      continue;
    }

    const prefix = normalizeLayoutKey(match[1]);
    if (!prefix) {
      continue;
    }

    const index = Number(match[2]);
    const key = normalizeLayoutKey(match[3]);
    const layouts = candidatePrefixes.get(prefix) || new Map();
    const current = layouts.get(index) || { index, fields: {} };
    current.fields[key] = value;
    layouts.set(index, current);
    candidatePrefixes.set(prefix, layouts);
  }

  const candidates = new Map(
    [...candidatePrefixes.entries()].map(([prefix, layouts]) => [
      prefix,
      [...layouts.values()]
        .sort((left, right) => left.index - right.index)
        .map((layout) => ({
          ...layout,
          type: String(layout.fields.layout_type || layout.fields.type || '').trim(),
        })),
    ])
  );

  return chooseBestLayoutPrefix(candidates)?.layouts.filter((layout) => layout.type) || [];
}

function buildLayoutSource(fields, layoutName) {
  const source = {};

  if (isPlainObject(fields?.[layoutName])) {
    Object.assign(source, fields[layoutName]);
  }

  for (const [key, value] of Object.entries(fields || {})) {
    if (key === 'layout_type' || key === 'type') {
      continue;
    }

    if (key.startsWith(`${layoutName}_`)) {
      source[key.slice(layoutName.length + 1)] = value;
      continue;
    }

    if (!(key in source)) {
      source[key] = value;
    }
  }

  return source;
}

function getSectionComponentUid(layoutName) {
  return `acf-sections.${shortenWithHash(slugify(layoutName), 80)}`;
}

function buildUnmappedLayoutComponent(layout) {
  const source = buildLayoutSource(layout.fields, layout.type);

  return pickDefined({
    __component: 'acf-sections.unmapped-layout',
    layout_type: layout.type,
    title: sanitizeShortText(
      firstMeaningful(
        source.main_title,
        source.title,
        source.heading,
        source.section_title,
        source.common_heading,
        source.hero_title
      ),
      255
    ),
    description: sanitizePlainText(
      firstMeaningful(
        source.description,
        source.common_description,
        source.content,
        source.text,
        source.body,
        source.intro_text,
        source.short_description
      )
    ),
    raw_fields: isMeaningfulValue(source) ? source : layout.fields,
  });
}

function loadManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  if (!fs.existsSync(manifestPath)) {
    fail(`ACF page-builder manifest not found: ${manifestPath}`);
  }

  const manifest = readJson(manifestPath);
  if (!Array.isArray(manifest?.layoutGroups) || manifest.layoutGroups.length === 0) {
    fail(`ACF page-builder manifest is invalid: ${manifestPath}`);
  }

  return manifest;
}

async function buildPageBuilder(acf, tools = {}, options = {}) {
  const manifest = loadManifest(options.manifestPath);
  const layoutMap = new Map(manifest.layoutGroups.map((layout) => [layout.name, layout]));
  const layouts = buildFlexibleLayouts(acf);
  const pageBuilder = [];

  for (const layout of layouts) {
    const layoutDefinition = layoutMap.get(layout.type);
    if (!layoutDefinition) {
      pageBuilder.push(buildUnmappedLayoutComponent(layout));
      continue;
    }

    const source = buildLayoutSource(layout.fields, layout.type);
    const component = await mapFields(
      layoutDefinition.sub_fields || [],
      source,
      tools,
      [slugify(layout.type)]
    );

    if (!isMeaningfulValue(component)) {
      continue;
    }

    const sectionSpacePadding = await mapField(
      buildSectionSpacePaddingField(),
      source,
      tools,
      [slugify(layout.type), 'section-space-padding']
    );

    if (isMeaningfulValue(sectionSpacePadding) && !isMeaningfulValue(component.section_space_padding)) {
      component.section_space_padding = sectionSpacePadding;
    }

    pageBuilder.push({
      __component: getSectionComponentUid(layout.type),
      ...component,
    });
  }

  return pageBuilder;
}

module.exports = {
  DEFAULT_MANIFEST_PATH,
  buildFlexibleLayouts,
  buildPageBuilder,
  loadManifest,
};

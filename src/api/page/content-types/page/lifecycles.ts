import crypto from 'node:crypto';

const PAGE_TYPES = ['landing', 'blog', 'about', 'service', 'career', 'resource'] as const;
const PAGE_DOCUMENT_PATH_REGEX =
  /^\/content-manager\/collection-types\/api::page\.page\/([^/?#]+)\/?$/;
const PAGE_BUILDER_HASH_ACF_KEY = '_pageBuilderHash';
const OMITTED_HASH_KEYS = new Set([
  'id',
  'documentId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  '__pivot',
  '__temp_key',
  'locale',
  'localizations',
]);

type PageType = (typeof PAGE_TYPES)[number];
type PageEntry = Record<string, unknown>;
type DynamicZoneComponent = Record<string, unknown> & { __component?: unknown };

function pageSupportsAcf() {
  return Boolean(strapi.contentType('api::page.page')?.attributes?.acf);
}

function isPageType(value: unknown): value is PageType {
  return typeof value === 'string' && PAGE_TYPES.includes(value as PageType);
}

function isPlainObject(value: unknown): value is PageEntry {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function tryParseJsonObject(value: unknown) {
  if (isPlainObject(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeValueForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValueForHash(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const normalizedEntries = Object.entries(value)
    .filter(([key, entryValue]) => !OMITTED_HASH_KEYS.has(key) && entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => [key, normalizeValueForHash(entryValue)]);

  return Object.fromEntries(normalizedEntries);
}

function computePageBuilderHash(pageBuilder: unknown) {
  const normalized = normalizeValueForHash(pageBuilder);
  return crypto
    .createHash('sha1')
    .update(JSON.stringify(normalized))
    .digest('hex');
}

function getRequestDocumentId() {
  const requestPath = strapi.requestContext.get()?.request?.path;
  if (typeof requestPath !== 'string') {
    return null;
  }

  return requestPath.match(PAGE_DOCUMENT_PATH_REGEX)?.[1] || null;
}

function mergeAcfWithPageBuilderHash(existingAcf: unknown, nextAcf: unknown, hash: string) {
  return {
    ...(tryParseJsonObject(existingAcf) ?? {}),
    ...(tryParseJsonObject(nextAcf) ?? {}),
    [PAGE_BUILDER_HASH_ACF_KEY]: hash,
  };
}

async function getCurrentPageState(documentId: string | null) {
  if (!pageSupportsAcf()) {
    return null;
  }

  if (!documentId) {
    return null;
  }

  const pageRow = await strapi.db
    .connection('pages')
    .select(['id', 'document_id', 'acf'])
    .where('document_id', documentId)
    .first();

  if (!pageRow) {
    return null;
  }

  const acf = tryParseJsonObject(pageRow.acf) ?? {};

  return {
    id: pageRow.id,
    documentId: pageRow.document_id,
    acf,
    pageBuilderHash:
      typeof acf[PAGE_BUILDER_HASH_ACF_KEY] === 'string'
        ? acf[PAGE_BUILDER_HASH_ACF_KEY]
        : null,
  };
}

async function optimizeUnchangedPageBuilderUpdate(entry: PageEntry) {
  if (!Object.prototype.hasOwnProperty.call(entry, 'pageBuilder')) {
    return;
  }

  const incomingPageBuilder = entry.pageBuilder;
  if (!Array.isArray(incomingPageBuilder)) {
    return;
  }

  const documentId = getRequestDocumentId();
  const currentPageState = await getCurrentPageState(documentId);
  const incomingHash = computePageBuilderHash(incomingPageBuilder);

  if (!pageSupportsAcf()) {
    return;
  }

  if (currentPageState?.pageBuilderHash && currentPageState.pageBuilderHash === incomingHash) {
    delete entry.pageBuilder;

    if (Object.prototype.hasOwnProperty.call(entry, 'acf')) {
      entry.acf = mergeAcfWithPageBuilderHash(currentPageState.acf, entry.acf, incomingHash);
    }

    strapi.log.info(
      `[page-save-skip-builder] documentId=${documentId} reason=unchanged-pageBuilder`
    );
    return;
  }

  entry.acf = mergeAcfWithPageBuilderHash(currentPageState?.acf, entry.acf, incomingHash);
}

function ensurePageType(entry: PageEntry) {
  if (!isPageType(entry.pageType)) {
    entry.pageType = 'landing';
  }
}

function normalizePageTypeForUpdate(entry: PageEntry) {
  if (!Object.prototype.hasOwnProperty.call(entry, 'pageType')) {
    return;
  }

  if (!isPageType(entry.pageType)) {
    delete entry.pageType;
  }
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeSelectPostTypeValue(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'number') {
    return [String(value)];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      const parsedArray = parseJsonArray(trimmed);

      if (parsedArray) {
        return parsedArray;
      }
    }

    return [trimmed];
  }

  if (isPlainObject(value)) {
    const id = value.id;

    if (typeof id === 'number' || typeof id === 'string') {
      return [String(id)];
    }
  }

  return undefined;
}

function normalizeObjectSelectPostType(entry: PageEntry) {
  if (!Object.prototype.hasOwnProperty.call(entry, 'select_post_type')) {
    return;
  }

  const normalizedValue = normalizeSelectPostTypeValue(entry.select_post_type);

  if (normalizedValue === undefined) {
    delete entry.select_post_type;
    return;
  }

  entry.select_post_type = normalizedValue;
}

function normalizeSelectPostTypeDeep(value: unknown) {
  if (Array.isArray(value)) {
    value.forEach((item) => normalizeSelectPostTypeDeep(item));
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  normalizeObjectSelectPostType(value);

  Object.values(value).forEach((item) => normalizeSelectPostTypeDeep(item));
}

function normalizeDynamicZones(entry: PageEntry) {
  normalizeSelectPostTypeDeep(entry);
}

export default {
  beforeCreate(event: { params?: { data?: unknown } }) {
    if (isPlainObject(event.params?.data)) {
      ensurePageType(event.params.data);
      normalizeDynamicZones(event.params.data);

      if (pageSupportsAcf() && Array.isArray(event.params.data.pageBuilder)) {
        event.params.data.acf = mergeAcfWithPageBuilderHash(
          event.params.data.acf,
          event.params.data.acf,
          computePageBuilderHash(event.params.data.pageBuilder)
        );
      }
    }
  },

  async beforeUpdate(event: { params?: { data?: unknown } }) {
    if (isPlainObject(event.params?.data)) {
      normalizePageTypeForUpdate(event.params.data);
      normalizeDynamicZones(event.params.data);
      await optimizeUnchangedPageBuilderUpdate(event.params.data);
    }
  },

  afterFindOne(event: { result?: unknown }) {
    if (isPlainObject(event.result)) {
      ensurePageType(event.result);
    }
  },

  afterFindMany(event: { result?: unknown }) {
    if (Array.isArray(event.result)) {
      event.result.forEach((entry) => {
        if (isPlainObject(entry)) {
          ensurePageType(entry);
        }
      });
      return;
    }

    if (isPlainObject(event.result)) {
      ensurePageType(event.result);
    }
  },
};

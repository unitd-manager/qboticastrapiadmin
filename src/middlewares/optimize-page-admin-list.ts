import type { Core } from '@strapi/strapi';

const ADMIN_PAGES_LIST_PATH = '/content-manager/collection-types/api::page.page';
const ADMIN_PAGES_COUNT_PATH = '/content-manager/collection-types/api::page.page/actions/count';
const ADMIN_PAGES_COUNT_DRAFT_RELATIONS_PATH = '/content-manager/collection-types/api::page.page/actions/countDraftRelations';
const ADMIN_PAGES_LIST_PATH_REGEX = /^\/content-manager\/collection-types\/api::page\.page\/?$/;
const ADMIN_PAGES_DOCUMENT_PATH_REGEX =
  /^\/content-manager\/collection-types\/api::page\.page\/([^/?#]+)\/?$/;

const pageComponentTypeCache = new Map<
  string,
  { value: string[]; expiresAt: number }
>();

const PAGE_COMPONENT_TYPE_CACHE_TTL_MS = 30_000;
const DEFAULT_LEAN_ADMIN_DOCUMENT_POPULATE = false;
const DEFAULT_DEEP_COMPONENT_POPULATE = false;

const LIST_FIELDS = [
  'id',
  'documentId',
  'title',
  'slug',
  'updatedAt',
  'publishedAt',
  'createdAt',
] as const;

const readBooleanEnv = (name: string, fallback: boolean) => {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const SORT_FIELD_MAP: Record<string, string> = {
  id: 'id',
  documentId: 'document_id',
  title: 'title',
  slug: 'slug',
  updatedAt: 'updated_at',
  publishedAt: 'published_at',
  createdAt: 'created_at',
};

const clampPageSize = (value: unknown) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 25;
  }

  return Math.min(parsed, 50);
};

const parsePage = (value: unknown) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.trunc(parsed);
};

const parseSort = (input: unknown) => {
  const raw = Array.isArray(input) ? String(input[0] ?? '') : String(input ?? '');
  const [fieldRaw, directionRaw] = raw.split(':');
  const field = SORT_FIELD_MAP[fieldRaw] ? fieldRaw : 'id';
  const direction = String(directionRaw || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { field, direction };
};

const applyStatusFilter = (queryBuilder: any, status: unknown) => {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'published') {
    queryBuilder.whereNotNull('published_at');
    return;
  }

  if (normalized === 'draft') {
    queryBuilder.whereNull('published_at');
  }
};

const getDocumentIdFromPath = (requestPath: unknown) => {
  if (typeof requestPath !== 'string') {
    return null;
  }

  const match = requestPath.match(ADMIN_PAGES_DOCUMENT_PATH_REGEX);
  return match?.[1] || null;
};

const getCachedComponentTypes = (documentId: string) => {
  const cached = pageComponentTypeCache.get(documentId);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    pageComponentTypeCache.delete(documentId);
    return null;
  }

  return cached.value;
};

const setCachedComponentTypes = (documentId: string, value: string[]) => {
  pageComponentTypeCache.set(documentId, {
    value,
    expiresAt: Date.now() + PAGE_COMPONENT_TYPE_CACHE_TTL_MS,
  });
};

const getPageBuilderComponentTypes = async (strapi: Core.Strapi, documentId: string) => {
  const cached = getCachedComponentTypes(documentId);
  if (cached) {
    return cached;
  }

  const pageRow = await strapi.db
    .connection('pages')
    .select('id')
    .where('document_id', documentId)
    .first();

  const pageId = Number(pageRow?.id);
  if (!Number.isFinite(pageId) || pageId <= 0) {
    setCachedComponentTypes(documentId, []);
    return [];
  }

  const rows = await strapi.db
    .connection('pages_cmps')
    .distinct('component_type')
    .where({ entity_id: pageId, field: 'pageBuilder' });

  const componentTypes = (rows || [])
    .map((row) => row?.component_type)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  setCachedComponentTypes(documentId, componentTypes);
  return componentTypes;
};

const buildPopulateForUsedPageBuilderTypes = (componentTypes: string[]) => {
  const useDeepComponentPopulate = readBooleanEnv(
    'STRAPI_ADMIN_PAGE_DEEP_COMPONENT_POPULATE',
    DEFAULT_DEEP_COMPONENT_POPULATE
  );

  if (!Array.isArray(componentTypes) || componentTypes.length === 0) {
    return {
      pageBuilder: {
        populate: useDeepComponentPopulate ? '*' : {},
      },
    };
  }

  const on: Record<string, { populate?: '*' }> = {};
  for (const componentType of componentTypes) {
    on[componentType] = useDeepComponentPopulate ? { populate: '*' } : {};
  }

  return {
    pageBuilder: {
      on,
    },
  };
};

const buildLeanPageDocumentPopulate = () => ({
  // Populate the dynamic zone itself, but avoid recursive nested relation hydration
  // for every component type. This dramatically reduces admin document query cost.
  pageBuilder: true,
});

const optimizePageDocumentPopulate = async (
  strapi: Core.Strapi,
  requestPath: unknown,
  query: Record<string, any>,
  useLeanDocumentPopulate: boolean
) => {
  if (useLeanDocumentPopulate) {
    query.populate = buildLeanPageDocumentPopulate();
    return;
  }

  const documentId = getDocumentIdFromPath(requestPath);
  if (!documentId) {
    return;
  }

  const componentTypes = await getPageBuilderComponentTypes(strapi, documentId);
  query.populate = buildPopulateForUsedPageBuilderTypes(componentTypes);
};

export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  const useLeanDocumentPopulate = false;

  return async (ctx: any, next: () => Promise<void>) => {
    const requestPath = ctx?.request?.path;
    const method = ctx?.request?.method;
    const isListPath = typeof requestPath === 'string' && ADMIN_PAGES_LIST_PATH_REGEX.test(requestPath);
    const isDocumentPath = typeof requestPath === 'string' && ADMIN_PAGES_DOCUMENT_PATH_REGEX.test(requestPath);
    const isCountPath = requestPath === ADMIN_PAGES_COUNT_PATH;
    const isCountDraftRelationsPath = requestPath === ADMIN_PAGES_COUNT_DRAFT_RELATIONS_PATH;
    const isPagesCollectionPath =
      isListPath ||
      isCountPath ||
      isCountDraftRelationsPath;

    if (isDocumentPath && (method === 'GET' || method === 'PUT')) {
      const query = (ctx.query ?? {}) as Record<string, any>;
      const startedAt = Date.now();

      await optimizePageDocumentPopulate(strapi, requestPath, query, useLeanDocumentPopulate);

      // Keep document endpoint scoped to the published locale variant by default.
      if (!query.status) {
        query.status = 'published';
      }

      ctx.query = query;
      await next();

      // Page was updated, invalidate cached component type mapping for this document.
      if (method === 'PUT') {
        const documentId = getDocumentIdFromPath(requestPath);
        if (documentId) {
          pageComponentTypeCache.delete(documentId);
        }
      }

      const durationMs = Date.now() - startedAt;
      if (durationMs >= 1000 || ctx.status >= 400) {
        strapi.log.info(
          `[page-admin-document] status=${ctx.status} duration=${durationMs}ms method=${method} leanPopulate=${useLeanDocumentPopulate} deepComponentPopulate=${readBooleanEnv('STRAPI_ADMIN_PAGE_DEEP_COMPONENT_POPULATE', DEFAULT_DEEP_COMPONENT_POPULATE)}`
        );
      }

      return;
    }

    if (!isPagesCollectionPath || method !== 'GET') {
      await next();
      return;
    }

    const query = (ctx.query ?? {}) as Record<string, any>;

    if (isListPath) {
      const startedAt = Date.now();

      const pagination = { ...(query.pagination ?? {}) };
      const page = parsePage(pagination.page ?? query.page);
      const pageSize = clampPageSize(pagination.pageSize ?? query.pageSize);
      const offset = (page - 1) * pageSize;
      const { field: sortField, direction: sortDirection } = parseSort(query.sort);
      const sortColumn = SORT_FIELD_MAP[sortField] ?? 'id';

      const baseQuery = strapi.db.connection('pages');
      applyStatusFilter(baseQuery, query.status ?? 'published');

      const rows = await baseQuery
        .clone()
        .select([
          'id',
          'document_id as documentId',
          'title',
          'slug',
          'updated_at as updatedAt',
          'published_at as publishedAt',
          'created_at as createdAt',
        ])
        .orderBy(sortColumn, sortDirection)
        .limit(pageSize)
        .offset(offset);

      const countRow = await baseQuery
        .clone()
        .count('id as count')
        .first();

      const total = Number(countRow?.count ?? 0);
      const pageCount = Math.max(1, Math.ceil(total / pageSize));

      ctx.status = 200;
      ctx.body = {
        results: rows,
        pagination: {
          page,
          pageSize,
          pageCount,
          total,
        },
      };

      const durationMs = Date.now() - startedAt;
      strapi.log.info(
        `[page-admin-list-fast] status=200 path=${requestPath} duration=${durationMs}ms page=${page} pageSize=${pageSize} sort=${sortField}:${sortDirection}`
      );
      return;
    }

    if (!Array.isArray(query.fields) || query.fields.length === 0) {
      query.fields = [...LIST_FIELDS];
    }

    // Content-manager list does not need component trees for the left-table view.
    // Force an empty populate to avoid expensive dynamic-zone joins.
    query.populate = {};

    // Keep drafts relation out of the response on list/count endpoints.
    query.status = query.status ?? 'published';

    const pagination = { ...(query.pagination ?? {}) };
    pagination.page = parsePage(pagination.page ?? query.page);
    pagination.pageSize = clampPageSize(pagination.pageSize ?? query.pageSize);
    query.pagination = pagination;
    query.page = pagination.page;
    query.pageSize = pagination.pageSize;

    if (!query.sort) {
      // id is indexed by default; sorting by it avoids filesort on large tables.
      query.sort = ['id:desc'];
    }

    ctx.query = query;

    const startedAt = Date.now();
    await next();

    const durationMs = Date.now() - startedAt;

    if (durationMs >= 1000 || ctx.status >= 400) {
      strapi.log.info(
        `[page-admin-list] status=${ctx.status} duration=${durationMs}ms page=${query.page} pageSize=${query.pageSize}`
      );
    }
  };
};

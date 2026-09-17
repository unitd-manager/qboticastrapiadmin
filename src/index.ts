import type { Core } from '@strapi/strapi';

function readBooleanEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function getBootstrapMaintenanceConfig() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    runSchemaMaintenance: readBooleanEnv('STRAPI_BOOTSTRAP_SCHEMA_MAINTENANCE', isProduction),
    runPermissionSync: readBooleanEnv('STRAPI_BOOTSTRAP_PERMISSION_SYNC', true),
    runQueryProfiler: readBooleanEnv('STRAPI_QUERY_PROFILER', false),
  };
}

function enableQueryProfiler(strapi: Core.Strapi) {
  const connection = strapi.db?.connection;
  if (!connection || typeof connection.on !== 'function') {
    return;
  }

  connection.on('query', (_query: unknown) => {
    const state = strapi.requestContext.get()?.state as
      | { __queryProfilerCount?: number }
      | undefined;

    if (!state) {
      return;
    }

    state.__queryProfilerCount = (state.__queryProfilerCount || 0) + 1;
  });

  strapi.server.use(async (ctx, next) => {
    const isPageContentManagerRequest =
      typeof ctx.path === 'string' &&
      ctx.path.startsWith('/content-manager/collection-types/api::page.page');

    if (!isPageContentManagerRequest) {
      await next();
      return;
    }

    const startedAt = Date.now();
    ctx.state.__queryProfilerCount = 0;

    await next();

    strapi.log.info(
      `[query-profiler] method=${ctx.method} path=${ctx.path} status=${ctx.status} queries=${ctx.state.__queryProfilerCount || 0} durationMs=${Date.now() - startedAt}`
    );
  });
}

function isTransientDbError(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '').toUpperCase()
      : '';

  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : String(error || '');

  return (
    ['ETIMEDOUT', 'ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR'].includes(code) ||
    /timed out|connection lost|too many connections/i.test(message)
  );
}

async function runWithBootstrapRetry(
  strapi: Core.Strapi,
  label: string,
  task: () => Promise<void>,
  maxAttempts = 3
) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await task();
      return;
    } catch (error) {
      lastError = error;

      if (!isTransientDbError(error) || attempt >= maxAttempts) {
        break;
      }

      const delayMs = attempt * 1000;
      strapi.log.warn(
        `[bootstrap] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms: ${error}`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  strapi.log.warn(`[bootstrap] ${label} skipped after retries: ${lastError}`);
}

async function warmDatabaseConnection(strapi: Core.Strapi) {
  try {
    const startedAt = Date.now();

    // Prime a connection from the pool and warm a frequently accessed table.
    await strapi.db.connection.raw('SELECT 1 AS ok');
    await strapi.db.connection('pages').select('id').orderBy('id', 'desc').limit(1);

    const durationMs = Date.now() - startedAt;
    strapi.log.info(`[bootstrap] database warmup completed in ${durationMs}ms`);
  } catch (error) {
    strapi.log.warn(`[bootstrap] database warmup skipped: ${error}`);
  }
}

async function ensureSharedMenuItemUrlUsesText(strapi: Core.Strapi) {
  const client = strapi.db?.connection?.client?.config?.client;
  if (!client || !['mysql', 'mysql2'].includes(client)) {
    return;
  }

  const databaseName = strapi.db?.connection?.client?.config?.connection?.database;
  if (!databaseName) {
    return;
  }

  const column = await strapi.db
    .connection('information_schema.columns')
    .select('data_type')
    .where({
      table_schema: databaseName,
      table_name: 'components_shared_menu_items',
      column_name: 'url',
    })
    .first();

  if (!column || typeof column.data_type !== 'string') {
    return;
  }

  if (column.data_type.toLowerCase() === 'text') {
    return;
  }

  await strapi.db.connection.raw(
    'ALTER TABLE `components_shared_menu_items` MODIFY COLUMN `url` TEXT NULL'
  );
}

async function ensurePublicPageReadPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!publicRole?.id) {
    return;
  }

  const roleService = strapi.plugin('users-permissions').service('role');
  const role = await roleService.findOne(publicRole.id);
  const pagePermissions = role?.permissions?.['api::page']?.controllers?.page;

  if (!pagePermissions?.find || !pagePermissions?.findOne) {
    return;
  }

  const shouldUpdate = !pagePermissions.find.enabled || !pagePermissions.findOne.enabled;
  if (!shouldUpdate) {
    return;
  }

  pagePermissions.find.enabled = true;
  pagePermissions.findOne.enabled = true;

  await roleService.updateRole(publicRole.id, {
    name: role.name,
    description: role.description,
    permissions: role.permissions,
  });
}

async function ensurePageIndexes(strapi: Core.Strapi) {
  const client = strapi.db?.connection?.client?.config?.client;
  if (!client || !['mysql', 'mysql2'].includes(client)) {
    return;
  }

  const databaseName = strapi.db?.connection?.client?.config?.connection?.database;
  if (!databaseName) {
    return;
  }

  const existingIndexes = await strapi.db
    .connection('information_schema.statistics')
    .select('index_name')
    .where({
      table_schema: databaseName,
      table_name: 'pages',
    });

  const indexNames = new Set(
    (existingIndexes || [])
      .map((row) => row?.index_name)
      .filter((name): name is string => typeof name === 'string')
  );

  const createIndexIfMissing = async (indexName: string, ddl: string) => {
    if (indexNames.has(indexName)) {
      return;
    }

    try {
      await strapi.db.connection.raw(ddl);
      indexNames.add(indexName);
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code || '').toUpperCase()
          : '';
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : String(error || '');

      if (code === 'ER_DUP_KEYNAME' || /duplicate key name/i.test(message)) {
        indexNames.add(indexName);
        return;
      }

      throw error;
    }
  };

  const tableColumns = await strapi.db
    .connection('information_schema.columns')
    .select('column_name')
    .where({
      table_schema: databaseName,
      table_name: 'pages',
    });

  const columnNames = new Set(
    (tableColumns || [])
      .map((row) => row?.column_name)
      .filter((name): name is string => typeof name === 'string')
  );

  await createIndexIfMissing(
    'idx_pages_updated_at',
    'CREATE INDEX `idx_pages_updated_at` ON `pages` (`updated_at`)'
  );
  await createIndexIfMissing(
    'idx_pages_slug',
    'CREATE INDEX `idx_pages_slug` ON `pages` (`slug`)'
  );
  await createIndexIfMissing(
    'idx_pages_created_at',
    'CREATE INDEX `idx_pages_created_at` ON `pages` (`created_at`)'
  );

  if (columnNames.has('published_at')) {
    await createIndexIfMissing(
      'idx_pages_published_at',
      'CREATE INDEX `idx_pages_published_at` ON `pages` (`published_at`)'
    );
  }
}

async function ensureMediaRelationIndexes(strapi: Core.Strapi) {
  const client = strapi.db?.connection?.client?.config?.client;
  if (!client || !['mysql', 'mysql2'].includes(client)) {
    return;
  }

  const databaseName = strapi.db?.connection?.client?.config?.connection?.database;
  if (!databaseName) {
    return;
  }

  const tableName = 'files_related_mph';

  const tableRow = await strapi.db
    .connection('information_schema.tables')
    .select('table_name')
    .where({ table_schema: databaseName, table_name: tableName })
    .first();

  if (!tableRow) {
    return;
  }

  const existingIndexes = await strapi.db
    .connection('information_schema.statistics')
    .select('index_name')
    .where({
      table_schema: databaseName,
      table_name: tableName,
    });

  const indexNames = new Set(
    (existingIndexes || [])
      .map((row) => row?.index_name)
      .filter((name): name is string => typeof name === 'string')
  );

  const createIndexIfMissing = async (indexName: string, ddl: string) => {
    if (indexNames.has(indexName)) {
      return;
    }

    try {
      await strapi.db.connection.raw(ddl);
      indexNames.add(indexName);
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code || '').toUpperCase()
          : '';
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : String(error || '');

      if (code === 'ER_DUP_KEYNAME' || /duplicate key name/i.test(message)) {
        indexNames.add(indexName);
        return;
      }

      throw error;
    }
  };

  await createIndexIfMissing(
    'files_related_mph_related_type_field_related_id_idx',
    'CREATE INDEX `files_related_mph_related_type_field_related_id_idx` ON `files_related_mph` (`related_type`, `field`, `related_id`)'
  );
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const { runSchemaMaintenance, runPermissionSync, runQueryProfiler } =
      getBootstrapMaintenanceConfig();

    if (runQueryProfiler) {
      enableQueryProfiler(strapi);
    }

    await warmDatabaseConnection(strapi);

    if (runSchemaMaintenance) {
      await runWithBootstrapRetry(strapi, 'schema maintenance (menu-item url)', async () => {
        await ensureSharedMenuItemUrlUsesText(strapi);
      });
      await runWithBootstrapRetry(strapi, 'schema maintenance (page indexes)', async () => {
        await ensurePageIndexes(strapi);
      });
      await runWithBootstrapRetry(strapi, 'schema maintenance (media relation indexes)', async () => {
        await ensureMediaRelationIndexes(strapi);
      });
    }

    if (runPermissionSync) {
      await runWithBootstrapRetry(strapi, 'public permission sync', async () => {
        await ensurePublicPageReadPermissions(strapi);
      });
    }
  },
};

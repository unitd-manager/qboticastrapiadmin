import path from 'path';
import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  const client = env('DATABASE_CLIENT', 'sqlite');
  const nodeEnv = env('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  // For remote DBs, 60s connection timeout is too high — use 30s so pool errors surface quickly.
  const connectionTimeout = env.int('DATABASE_CONNECTION_TIMEOUT', 30000);
  const databaseHost = env('DATABASE_HOST', 'localhost');
  const databasePort = env.int('DATABASE_PORT', client === 'postgres' ? 5432 : 3306);
  const databaseName = env('DATABASE_NAME', 'qbstrapi');
  const databaseUser = env('DATABASE_USERNAME', 'root');
  const databaseUrl = env('DATABASE_URL');
  const databaseSsl = env.bool('DATABASE_SSL', false);
  const driverConnectTimeout = env.int('DATABASE_CONNECT_TIMEOUT', connectionTimeout);
  // Keep the pool deliberately small for a remote MySQL instance that drops idle sockets.
  // This reduces the chance of multiple stale connections being re-used during startup.
  const poolMin = env.int('DATABASE_POOL_MIN', 1);
  const poolMax = env.int('DATABASE_POOL_MAX', 4);

  const connections = {
    mysql: {
      connection: {
        host: databaseHost,
        port: env.int('DATABASE_PORT', 3306),
        database: databaseName,
        user: databaseUser,
        password: env('DATABASE_PASSWORD', ''),
        connectTimeout: driverConnectTimeout,
        // Some remote MySQL servers reset idle sockets unexpectedly when keepalive is enabled.
        // Disable it for stability during Strapi startup and normal admin workloads.
        enableKeepAlive: false,
        ssl: databaseSsl && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: {
        min: poolMin,
        max: poolMax,
        // Release idle sockets quickly to avoid reusing dead connections on flaky remote hosts.
        idleTimeoutMillis: env.int('DATABASE_POOL_IDLE_TIMEOUT', 15000),
        acquireTimeoutMillis: connectionTimeout,
        // More frequent reap keeps the pool healthy under resets.
        reapIntervalMillis: 5000,
        createTimeoutMillis: connectionTimeout,
        destroyTimeoutMillis: 3000,
      },
    },
    postgres: {
      connection: {
        connectionString: databaseUrl,
        host: databaseHost,
        port: env.int('DATABASE_PORT', 5432),
        database: databaseName,
        user: databaseUser,
        password: env('DATABASE_PASSWORD', ''),
        ssl: databaseSsl && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        min: poolMin,
        max: poolMax,
        idleTimeoutMillis: env.int('DATABASE_POOL_IDLE_TIMEOUT', 300000),
        acquireTimeoutMillis: connectionTimeout,
      },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: connectionTimeout,
    },
  };
};

export default config;

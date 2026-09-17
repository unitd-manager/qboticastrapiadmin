import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 3123),
  proxy: true,
  url: env('PUBLIC_URL', env('STRAPI_PUBLIC_URL', '')) || undefined,
  app: {
    keys: env.array('APP_KEYS'),
  },
});

export default config;

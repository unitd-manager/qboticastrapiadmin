import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'strapi-schema-extender': {
    enabled: true,
  },
  custom: {
    enabled: true,
    resolve: './src/plugins/custom',
  },
});

export default config;

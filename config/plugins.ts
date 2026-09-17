import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  custom: {
    enabled: true,
    resolve: './src/plugins/custom',
  },
});

export default config;

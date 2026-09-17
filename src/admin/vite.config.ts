import { mergeConfig, type UserConfig } from 'vite';

export default (config: UserConfig) => {
  return mergeConfig(config, {
    optimizeDeps: {
      // Pre-bundle the admin deps we rely on to reduce runtime optimizer churn
      // that can invalidate dynamic chunks such as EditViewPage during dev.
      force: true,
      include: [
        '@strapi/content-manager/strapi-admin',
        '@strapi/design-system',
        '@strapi/icons',
        '@strapi/strapi/admin',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'styled-components',
      ],
    },
  });
};

import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  {
    name: 'global::normalize-media-urls',
  },
  'strapi::favicon',
  'strapi::public',
  {
    name: 'global::optimize-page-admin-list',
  },
  {
    name: 'global::qbo-posts-router',
  },
];

export default config;

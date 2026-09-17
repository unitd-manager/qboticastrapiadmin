/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');

const {
  PAGE_BUILDER_COMPONENTS,
} = require('../config/section-components');

const pageSchemaPath = path.resolve(
  process.cwd(),
  'src/api/page/content-types/page/schema.json'
);

const HIDDEN_PLUGIN_OPTIONS = {
  'content-manager': {
    visible: false,
  },
};

function createDynamicZone(components, options = {}) {
  return {
    type: 'dynamiczone',
    ...options,
    components,
  };
}

function createSectionAttributes() {
  return {
    acf: {
      type: 'json',
      pluginOptions: HIDDEN_PLUGIN_OPTIONS,
    },
  };
}

function buildPageSchema() {
  return {
    kind: 'collectionType',
    collectionName: 'pages',

    info: {
      displayName: 'Page',
      singularName: 'page',
      pluralName: 'pages',
    },

    attributes: {
      title: {
        type: 'string',
        pluginOptions: HIDDEN_PLUGIN_OPTIONS,
      },

      slug: {
        type: 'uid',
        targetField: 'title',
        pluginOptions: HIDDEN_PLUGIN_OPTIONS,
      },

      seo: {
        type: 'component',
        repeatable: false,
        component: 'shared.seo',
      },

      pageType: {
        type: 'enumeration',
        enum: [
          'landing',
          'blog',
          'about',
          'service',
          'career',
          'resource',
        ],
        default: 'landing',
        pluginOptions: HIDDEN_PLUGIN_OPTIONS,
      },

      ...createSectionAttributes(),

      pageBuilder: createDynamicZone(
        PAGE_BUILDER_COMPONENTS,
        {
          configurable: false,
        }
      ),
    },
  };
}

function writeSchema() {
  const schema = buildPageSchema();

  fs.mkdirSync(path.dirname(pageSchemaPath), {
    recursive: true,
  });

  fs.writeFileSync(
    pageSchemaPath,
    JSON.stringify(schema, null, 2),
    'utf8'
  );

  console.log(
    `✅ Generated ${path.relative(
      process.cwd(),
      pageSchemaPath
    )}`
  );
}

writeSchema();

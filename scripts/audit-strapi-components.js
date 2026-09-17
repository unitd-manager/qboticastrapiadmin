/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const componentsRoot = path.join(projectRoot, 'src', 'components');
const apiRoot = path.join(projectRoot, 'src', 'api');
const pageSchemaPath = path.join(apiRoot, 'page', 'content-types', 'page', 'schema.json');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');

  try {
    return JSON.parse(raw);
  } catch (error) {
    error.message = `Failed to parse JSON in ${filePath}: ${error.message}`;
    throw error;
  }
}

function walkJsonFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function getNamespace(uid) {
  return typeof uid === 'string' && uid.includes('.') ? uid.split('.')[0] : '(unknown)';
}

function collectAttributeComponentRefs(attributes, refs) {
  if (!attributes || typeof attributes !== 'object') {
    return;
  }

  for (const attribute of Object.values(attributes)) {
    if (!attribute || typeof attribute !== 'object') {
      continue;
    }

    if (attribute.type === 'component' && typeof attribute.component === 'string') {
      refs.add(attribute.component);
    }

    if (attribute.type === 'dynamiczone' && Array.isArray(attribute.components)) {
      for (const componentUid of attribute.components) {
        if (typeof componentUid === 'string') {
          refs.add(componentUid);
        }
      }
    }
  }
}

function loadComponentSchemas() {
  const componentFiles = walkJsonFiles(componentsRoot);
  const componentSchemas = new Map();
  const namespaceCounts = new Map();

  for (const filePath of componentFiles) {
    const namespace = path.basename(path.dirname(filePath));
    const schema = readJson(filePath);
    const fileName = path.basename(filePath, '.json');
    const uid = `${namespace}.${fileName}`;
    const refs = new Set();

    collectAttributeComponentRefs(schema.attributes, refs);

    componentSchemas.set(uid, {
      uid,
      namespace,
      filePath,
      refs,
    });

    namespaceCounts.set(namespace, (namespaceCounts.get(namespace) || 0) + 1);
  }

  return { componentSchemas, namespaceCounts };
}

function loadContentTypeRoots() {
  const schemaFiles = walkJsonFiles(apiRoot).filter((filePath) => filePath.endsWith(`${path.sep}schema.json`));
  const rootsByContentType = [];

  for (const filePath of schemaFiles) {
    const schema = readJson(filePath);
    const refs = new Set();
    collectAttributeComponentRefs(schema.attributes, refs);

    rootsByContentType.push({ filePath, refs });
  }

  return rootsByContentType;
}

function resolveReachableComponents(rootUids, componentSchemas) {
  const visited = new Set();
  const stack = [...rootUids];

  while (stack.length > 0) {
    const uid = stack.pop();
    if (!uid || visited.has(uid)) {
      continue;
    }

    visited.add(uid);
    const schema = componentSchemas.get(uid);
    if (!schema) {
      continue;
    }

    for (const ref of schema.refs) {
      if (!visited.has(ref)) {
        stack.push(ref);
      }
    }
  }

  return visited;
}

function toSortedArray(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function countByNamespace(uids) {
  const counts = new Map();

  for (const uid of uids) {
    const namespace = getNamespace(uid);
    counts.set(namespace, (counts.get(namespace) || 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  });
}

function formatNamespaceCounts(entries) {
  return entries.map(([namespace, count]) => `${namespace}: ${count}`).join(', ');
}

function main() {
  if (!fs.existsSync(componentsRoot)) {
    throw new Error('src/components was not found. Run this from the project root.');
  }

  const { componentSchemas, namespaceCounts } = loadComponentSchemas();
  const rootsByContentType = loadContentTypeRoots();
  const pageSchema = readJson(pageSchemaPath);
  const pageBuilderComponents = pageSchema.attributes?.pageBuilder?.components || [];
  const pageBuilderReachable = resolveReachableComponents(pageBuilderComponents, componentSchemas);
  const allContentTypeRoots = new Set();

  for (const entry of rootsByContentType) {
    for (const uid of entry.refs) {
      allContentTypeRoots.add(uid);
    }
  }

  const allSchemaReachable = resolveReachableComponents(allContentTypeRoots, componentSchemas);
  const schemaUnused = [...componentSchemas.keys()].filter((uid) => !allSchemaReachable.has(uid)).sort((a, b) => a.localeCompare(b));
  const directLegacyPageBuilder = pageBuilderComponents.filter((uid) => !uid.startsWith('acf-sections.'));

  console.log('STRAPI_COMPONENT_AUDIT_START');
  console.log(`Total component schemas: ${componentSchemas.size}`);
  console.log(`Component namespaces: ${formatNamespaceCounts([...namespaceCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))}`);
  console.log('');

  console.log(`Page pageBuilder direct components: ${pageBuilderComponents.length}`);
  console.log(`Page pageBuilder direct namespaces: ${formatNamespaceCounts(countByNamespace(pageBuilderComponents))}`);

  if (directLegacyPageBuilder.length > 0) {
    console.log('Legacy non-acf pageBuilder entries:');
    for (const uid of directLegacyPageBuilder) {
      console.log(`- ${uid}`);
    }
  } else {
    console.log('Legacy non-acf pageBuilder entries: none');
  }

  console.log('');
  console.log(`Page pageBuilder transitive component set: ${pageBuilderReachable.size}`);
  console.log(`Page pageBuilder transitive namespaces: ${formatNamespaceCounts(countByNamespace(pageBuilderReachable))}`);

  const acfSectionRoots = pageBuilderComponents.filter((uid) => uid.startsWith('acf-sections.'));
  const acfSectionsReachable = resolveReachableComponents(acfSectionRoots, componentSchemas);
  console.log(`acf-sections transitive namespaces: ${formatNamespaceCounts(countByNamespace(acfSectionsReachable))}`);

  const sharedDependencies = toSortedArray(acfSectionsReachable).filter((uid) => uid.startsWith('acf-shared.'));
  console.log(`acf-shared components required by acf-sections: ${sharedDependencies.length}`);

  console.log('');
  console.log(`All content-type transitive component set: ${allSchemaReachable.size}`);
  console.log(`All content-type transitive namespaces: ${formatNamespaceCounts(countByNamespace(allSchemaReachable))}`);
  console.log(`Schema-unused components: ${schemaUnused.length}`);

  if (schemaUnused.length > 0) {
    console.log('Schema-unused component UIDs (DB/content audit still required before deletion):');
    for (const uid of schemaUnused) {
      console.log(`- ${uid}`);
    }
  }

  console.log('STRAPI_COMPONENT_AUDIT_END');
}

main();
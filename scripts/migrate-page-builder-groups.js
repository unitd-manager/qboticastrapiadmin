#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ROOT = path.resolve(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env'));

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:3123';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
const PAGE_SIZE = Math.min(toPositiveNumber(process.env.PAGE_GROUP_MIGRATION_BATCH_SIZE, 25), 100);
const PAGE_LIMIT = toPositiveNumber(process.env.PAGE_GROUP_MIGRATION_LIMIT, 0);
const PAGE_SLUGS = parseCsv(process.env.PAGE_GROUP_MIGRATION_SLUGS || '');
const PAGE_UPDATE_RETRIES = toPositiveNumber(process.env.PAGE_GROUP_MIGRATION_RETRIES, 2);
const DRY_RUN = toBoolean(process.env.DRY_RUN, false);
const FORCE = toBoolean(process.env.PAGE_GROUP_MIGRATION_FORCE, false);

const PAGE_TYPE_TO_ZONE_FIELD = {
  landing: 'landingSections',
  blog: 'blogSections',
  about: 'aboutSections',
  service: 'serviceSections',
  career: 'careerSections',
  resource: 'resourceSections',
};

const ABOUT_COMPONENTS = new Set([
  'acf-sections.about-banner-layout',
  'acf-sections.about-awards-section',
  'acf-sections.about-partner-section',
  'acf-sections.about-client-logo-section',
  'acf-sections.about-team-section',
  'acf-sections.about-company-ethos-section',
  'acf-sections.about-grid-layout',
  'acf-sections.about-diversity-section',
  'acf-sections.about-training-section',
  'acf-sections.about-strategic-highlights-section',
  'acf-sections.about-latest-updates-section',
  'acf-sections.about-location-section',
]);

const CAREER_COMPONENTS = new Set([
  'acf-sections.team-highlight-block',
  'acf-sections.hiring-process-steps-layout',
  'acf-sections.career-openings-section',
  'acf-sections.form-with-contact-info',
  'acf-sections.contact-location-section',
]);

const RESOURCE_COMPONENTS = new Set([
  'acf-sections.latest-webinars',
  'acf-sections.featured-webinars-media',
  'acf-sections.resource-grid-layout',
  'acf-sections.use-cases-grid',
  'acf-sections.use-case-single',
  'acf-sections.white-paper-single',
  'acf-sections.usecase-industry-filter',
  'acf-sections.usecase-highlight-block',
  'acf-sections.timeline-sections',
  'acf-sections.session-item-sections',
  'acf-sections.roundtable-sessions-sections',
]);

const BLOG_COMPONENTS = new Set([
  'acf-sections.blog-layout',
  'acf-sections.latest-post',
  'acf-sections.common-posts-slider',
  'acf-sections.classic-post-slider',
]);

const SERVICE_COMPONENTS = new Set([
  'acf-sections.home-industry-automation-solutions',
  'acf-sections.service-overview',
  'acf-sections.solutions-key-benefits',
  'acf-sections.industry-highlight-block',
  'acf-sections.text-image-split-block',
  'acf-sections.image-with-keypoints',
  'acf-sections.image-form-section',
  'acf-sections.ai-tech-overview',
  'acf-sections.text-table-block',
  'acf-sections.industry-ai-use-cases',
  'acf-sections.benefits-grid-layout',
  'acf-sections.step-cards-section',
  'acf-sections.solution-hero-banner-with-cta',
  'acf-sections.solutions-feature-block',
  'acf-sections.healthcare-automation-solutions',
  'acf-sections.collaborations-section',
  'acf-sections.partner-highlight-section',
  'acf-sections.healthcare-automation-tabs',
  'acf-sections.automation-cta-block',
  'acf-sections.package-card-section',
  'acf-sections.kognitos-benefits-section',
  'acf-sections.why-kognitos-section',
  'acf-sections.how-it-works-section',
  'acf-sections.our-capabilities-section',
]);

const stats = {
  scanned: 0,
  updated: 0,
  skippedEmpty: 0,
  skippedExisting: 0,
  failed: 0,
};

function toBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseCsv(value) {
  return String(value)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
}

function buildUrl(apiPath, params = {}) {
  const url = new URL(apiPath, STRAPI_URL);
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(key, String(entry)));
      return;
    }

    searchParams.append(key, String(value));
  });

  url.search = searchParams.toString();
  return url.toString();
}

async function strapiRequest(method, apiPath, { data, params } = {}) {
  const headers = {};
  if (STRAPI_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  }

  const response = await axios({
    method,
    url: buildUrl(apiPath, params),
    data,
    headers,
    maxBodyLength: Infinity,
  });

  return response.data;
}

function summarizeError(error) {
  if (axios.isAxiosError(error)) {
    return JSON.stringify({
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
  }

  return error?.message || String(error);
}

function isRetryableError(error) {
  const status = error?.response?.status;
  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  const code = String(error?.code || '').toUpperCase();
  return ['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ERR_BAD_RESPONSE'].includes(code);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function containsAny(value, needles) {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

function getComponentTypes(page) {
  const sections = Array.isArray(page.pageBuilder) ? page.pageBuilder : [];
  return new Set(
    sections.map((section) => section?.__component).filter((component) => typeof component === 'string')
  );
}

function hasAnyComponent(components, markerSet) {
  for (const component of markerSet) {
    if (components.has(component)) {
      return true;
    }
  }

  return false;
}

function inferPageType(page) {
  const existingPageType = page.pageType;
  if (existingPageType && PAGE_TYPE_TO_ZONE_FIELD[existingPageType]) {
    return existingPageType;
  }

  const components = getComponentTypes(page);

  if (hasAnyComponent(components, ABOUT_COMPONENTS)) {
    return 'about';
  }

  if (hasAnyComponent(components, CAREER_COMPONENTS)) {
    return 'career';
  }

  if (hasAnyComponent(components, RESOURCE_COMPONENTS)) {
    return 'resource';
  }

  if (hasAnyComponent(components, BLOG_COMPONENTS)) {
    return 'blog';
  }

  if (hasAnyComponent(components, SERVICE_COMPONENTS)) {
    return 'service';
  }

  if (containsAny(page.slug, ['about', 'company', 'team', 'culture'])) {
    return 'about';
  }

  if (containsAny(page.slug, ['career', 'careers', 'job', 'jobs', 'join-us', 'hiring'])) {
    return 'career';
  }

  if (containsAny(page.slug, ['resource', 'resources', 'webinar', 'white-paper', 'whitepaper', 'use-case'])) {
    return 'resource';
  }

  if (containsAny(page.slug, ['blog', 'news', 'article', 'post'])) {
    return 'blog';
  }

  if (containsAny(page.slug, ['service', 'services', 'solution', 'solutions', 'healthcare', 'automation'])) {
    return 'service';
  }

  return 'landing';
}

async function* getPages() {
  if (PAGE_SLUGS.length > 0) {
    for (const pageSlug of PAGE_SLUGS) {
      const response = await strapiRequest('get', '/api/pages', {
        params: {
          'filters[slug][$eq]': pageSlug,
          'pagination[pageSize]': 1,
        },
      });

      const rows = Array.isArray(response?.data) ? response.data : [];
      if (rows.length > 0) {
        yield rows[0];
      }
    }

    return;
  }

  let page = 1;
  let seen = 0;

  while (true) {
    const response = await strapiRequest('get', '/api/pages', {
      params: {
        'pagination[page]': page,
        'pagination[pageSize]': PAGE_SIZE,
      },
    });

    const rows = Array.isArray(response?.data) ? response.data : [];
    if (rows.length === 0) {
      return;
    }

    for (const row of rows) {
      yield row;
      seen += 1;
      if (PAGE_LIMIT > 0 && seen >= PAGE_LIMIT) {
        return;
      }
    }

    const pageCount = Number(response?.meta?.pagination?.pageCount || page);
    if (page >= pageCount) {
      return;
    }

    page += 1;
  }
}

async function updatePage(page, payload) {
  const documentId = page.documentId || page.id;
  if (!documentId) {
    throw new Error(`Page \"${page.slug || page.title || 'unknown'}\" is missing documentId`);
  }

  if (DRY_RUN) {
    console.log(`[DRY_RUN] Would update ${page.slug || documentId} -> ${payload.data.pageType}/${Object.keys(payload.data).find((key) => key.endsWith('Sections'))}`);
    return;
  }

  let lastError = null;

  for (let attempt = 1; attempt <= PAGE_UPDATE_RETRIES + 1; attempt += 1) {
    try {
      await strapiRequest('put', `/api/pages/${documentId}`, { data: payload });
      return;
    } catch (error) {
      lastError = error;
      if (attempt <= PAGE_UPDATE_RETRIES && isRetryableError(error)) {
        console.warn(`Retrying page group migration (${attempt}/${PAGE_UPDATE_RETRIES + 1}) for ${page.slug || documentId}: ${summarizeError(error)}`);
        await sleep(attempt * 1000);
        continue;
      }

      break;
    }
  }

  throw lastError;
}

async function main() {
  if (!STRAPI_TOKEN && !DRY_RUN) {
    throw new Error('Missing STRAPI_API_TOKEN. Set it in .env or run with DRY_RUN=true.');
  }

  for await (const page of getPages()) {
    stats.scanned += 1;

    if (!Array.isArray(page.pageBuilder) || page.pageBuilder.length === 0) {
      stats.skippedEmpty += 1;
      continue;
    }

    const pageType = inferPageType(page);
    const zoneField = PAGE_TYPE_TO_ZONE_FIELD[pageType];
    const existingSections = Array.isArray(page[zoneField]) ? page[zoneField] : [];

    if (!FORCE && existingSections.length > 0) {
      stats.skippedExisting += 1;
      continue;
    }

    const payload = {
      data: {
        pageType,
        [zoneField]: page.pageBuilder,
      },
    };

    try {
      await updatePage(page, payload);
      stats.updated += 1;
      console.log(`Updated ${page.slug || page.documentId || page.id} -> ${pageType}/${zoneField}`);
    } catch (error) {
      stats.failed += 1;
      console.error(`Failed ${page.slug || page.documentId || page.id}: ${summarizeError(error)}`);
    }
  }

  console.log('\nPage builder group migration summary');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
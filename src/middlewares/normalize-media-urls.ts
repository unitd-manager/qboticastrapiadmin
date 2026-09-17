import type { Core } from '@strapi/strapi';

const normalizeBaseUrl = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  return raw.replace(/\/+$/, '');
};

const toAbsoluteMediaUrl = (url: unknown, baseUrl: string) => {
  if (typeof url !== 'string') {
    return url;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (!url.startsWith('/uploads/')) {
    return url;
  }

  return `${baseUrl}${url}`;
};

const rewriteMediaUrls = (input: unknown, baseUrl: string, seen: WeakSet<object>) => {
  if (!input || typeof input !== 'object') {
    return;
  }

  if (seen.has(input as object)) {
    return;
  }

  seen.add(input as object);

  if (Array.isArray(input)) {
    for (const item of input) {
      rewriteMediaUrls(item, baseUrl, seen);
    }
    return;
  }

  const record = input as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(record, 'url')) {
    record.url = toAbsoluteMediaUrl(record.url, baseUrl);
  }

  for (const value of Object.values(record)) {
    rewriteMediaUrls(value, baseUrl, seen);
  }
};

export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  const configuredBaseUrl = normalizeBaseUrl(
    process.env.PUBLIC_URL || process.env.STRAPI_PUBLIC_URL || process.env.STRAPI_URL
  );

  return async (ctx: any, next: () => Promise<void>) => {
    await next();

    if (!ctx.body || typeof ctx.body !== 'object') {
      return;
    }

    const requestBaseUrl = normalizeBaseUrl(`${ctx.protocol}://${ctx.host}`);
    const baseUrl = configuredBaseUrl || requestBaseUrl;

    if (!baseUrl) {
      return;
    }

    rewriteMediaUrls(ctx.body, baseUrl, new WeakSet<object>());
  };
};

# Debug Session: `page-backfill-put-500`

Status: [OPEN]

## Symptom
- `node scripts/backfill-page-builder-from-acf.js` fails while updating page records.
- Observed runtime errors:
  - `PUT /api/pages/:id` returns HTTP `500 Internal Server Error`
  - script later aborts with `Can't add new command when connection is in closed state`
  - some media uploads also hit transient `ECONNRESET`

## Expected
- Backfill should keep the DB connection open for the whole run and update `pageBuilder` successfully.

## Initial Hypotheses
1. The generated `pageBuilder` payload for a page like `home` contains component data that violates the current Strapi schema and causes the `PUT` to fail.
2. A lifecycle, hook, or Strapi entity-service path on `page` throws during update even when the payload shape is valid.
3. The fallback builder now creates `sections.*` payloads whose nested fields contain unsupported shapes or oversized JSON that Strapi rejects at write time.
4. The MySQL connection used for WordPress attachment lookup is being reused after an early failure path closes it, leading to `Can't add new command when connection is in closed state`.
5. Media upload retries are masking the primary failure order, and one failed page update causes cleanup/connection shutdown before later layouts finish.

## Evidence Log
- User-provided terminal output shows:
  - media upload retries with `ECONNRESET`
  - `PUT http://localhost:3123/api/pages/e29n1tvhaallk7s6a1q3josz` returns `500`
  - process ends with `Can't add new command when connection is in closed state`
- Added instrumentation-only logs in `scripts/backfill-page-builder-from-acf.js` around page update payload preparation, request attempts, success, and failure.
- Added instrumentation-only logs in `src/api/page/controllers/page.ts` around `update()` entry, success, and failure.
- Confirmed a collector is already running at `http://127.0.0.1:7777/health`; the session env file now points new instrumentation to that collector.
- Captured update payload evidence:
  - `home` payload uses only `acf-sections.*` components and previously failed on update.
  - `about` payload updates successfully with 14 components, but they are `sections.hero` and `sections.features` fallback components, not `acf-sections.*`.
- Confirmed `about_*` layouts do not exist in `scripts/generated/acf-page-builder-manifest.json`, so the generated mapper cannot currently create native `acf-sections.*` entries for that page.
- Additional runtime evidence from the larger backfill batch shows repeated controller-side DB errors during update:
  - `components_shared_menu_items.url` receives PHP-serialized ACF link strings and fails with `Data too long for column 'url'`.
  - JSON columns like `components_acf_sections_common_posts_slider.selected_items` and `components_acf_sections_classic_post_slider.filter_by_category` receive PHP-serialized array strings and fail with `Invalid JSON text`.

## Fix
- Removed the generic fallback builder from:
  - `scripts/backfill-page-builder-from-acf.js`
  - `scripts/migrate-wordpress-to-strapi.js`
- Result: page backfill now writes only generated `acf-sections.*` components.
- Consequence: pages like `about` that depend on missing manifest layouts will no longer be backfilled as generic `sections.*`; they require real generated/manual `acf-sections` definitions to populate.
- Added a minimal ACF-only fallback component:
  - `src/components/acf-sections/unmapped-layout.json`
  - `src/api/page/content-types/page/schema.json` now allows `acf-sections.unmapped-layout`
  - `scripts/lib/acf-page-builder-mapper.js` now maps unknown layouts like `about_*` into `acf-sections.unmapped-layout`
- Verification: local mapper check returns `acf-sections.unmapped-layout` for `about_banner` instead of skipping the layout.
- Added centralized PHP-serialized value normalization in `scripts/lib/acf-page-builder-mapper.js`.
- Verification: local mapper check now converts:
  - serialized ACF link values into `{ label, url, targetBlank }`
  - serialized ACF array values into real JavaScript arrays for JSON fields

## Next Step
- Ask the user to rerun the failing pages or full backfill and confirm whether the remaining 500 errors are resolved after mapper normalization.

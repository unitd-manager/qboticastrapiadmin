# Debug Session: `pages-api-500`

- Status: `OPEN`
- Symptom: `GET /api/pages` returns `500 Internal Server Error`, blocking `scripts/backfill-page-builder-from-acf.js`
- Goal: identify the runtime failure point for the `page` API and apply the minimal fix after evidence is collected

## Hypotheses

1. A generated `pageBuilder` component schema is invalid at runtime and breaks `page` reads.
2. Custom `page` controller, route, or service code is throwing during `/api/pages`.
3. Existing `page` entries contain malformed `pageBuilder` data that cannot be serialized.
4. A middleware or route override specific to pages is failing before Strapi returns data.
5. The database schema is not aligned with the generated components, so Strapi fails when reading dynamic zone relations.

## Evidence Log

- Confirmed: Strapi bootstrap failed on generated component attributes named `id`.
- Evidence: controlled `strapi develop` reproduction reported `The attribute "id" is reserved and cannot be used in a model`, first observed on `why-kognitos-section` and then verified across 52 generated section components.
- Fix applied: generator now renames reserved fields like `id` to `acf_id`, and the page-builder mapper applies the same renaming during data mapping.
- Verification: after regeneration, no generated component contains a raw `id` attribute; the user reran `node scripts/backfill-page-builder-from-acf.js` and the `/api/pages` 500 no longer occurred.
- New symptom: backfill now progresses into media migration and hits remote download resets (`socket hang up` / `ECONNRESET`) for some WordPress asset URLs.
- New pagination evidence: with `PAGE_BACKFILL_SLUGS=home`, the script still paginated the full `/api/pages` collection and later failed on `pagination[page]=8`.
- Evidence: records in the page-8 window (`pages` table ids 176-200) all returned `200` individually, and the same window returned `200` when probed as `pagination[page]=176..200&pageSize=1`, so the failure was not tied to a single page slug.
- Confirmed workflow issue: the backfill ignored the targeted slug mode during collection traversal and continued scanning unrelated pages.
- Fix applied: when `PAGE_BACKFILL_SLUGS` is non-empty, `getPages()` now fetches only the requested slug(s) directly instead of paginating the full collection.
- Verification: dry run with `PAGE_BACKFILL_SLUGS=home`, `PAGE_BACKFILL_FORCE=true`, and `MIGRATE_MEDIA=false` scanned exactly one page and completed successfully.

## Fix

- Root cause fixed for the original `/api/pages` 500.
- Targeted-slug backfill path fixed for the page-8 pagination failure.
- Debug session remains open because live write-mode confirmation is still pending and media migration can still be flaky on some remote assets.

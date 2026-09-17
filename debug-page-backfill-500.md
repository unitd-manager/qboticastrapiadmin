# Debug Session: `page-backfill-500`

Status: [OPEN]

## Symptom
- `npm run backfill:pages` fails on `GET /api/pages?...` with HTTP `500 Internal Server Error`.

## Expected
- Strapi should return paginated page records so the backfill script can continue.

## Initial Hypotheses
1. Strapi can no longer serialize one or more `page` entries because a saved `pageBuilder` component payload is malformed.
2. A lifecycle, controller, or custom hook on the `page` content type throws during `find`.
3. A specific relation/media/component row created during backfill is inconsistent with the current schema and causes the entity service query to fail.
4. The default `GET /api/pages` response shape now includes a field that triggers a DB/runtime error only after some pages were updated.
5. The failure is data-specific to a subset of pages, and narrowing the query or response fields will identify the offending records.

## Evidence Log
- Pending instrumentation and reproduction.
- Authenticated `GET /api/pages?page=1&pageSize=1` succeeds, including default fields.
- Authenticated `GET /api/pages?fields[0]=slug&page=1&pageSize=1|2|10` succeeds.
- Current suspicion is narrowed to one specific page inside the first larger page window rather than a global schema failure.

## Next Step
- Collect runtime evidence from the Strapi server for the failing `GET /api/pages` request.

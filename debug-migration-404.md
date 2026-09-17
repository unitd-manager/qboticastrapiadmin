# Debug Session: migration-404 [OPEN]

## Symptom
- `npm run migrate:wordpress` connects to the WordPress DB, then fails with `Request failed with status code 404`.

## Expected
- The migration should create or skip Strapi entries successfully instead of receiving a `404` from Strapi.

## Hypotheses
- H1: One or more target Strapi collection endpoints are wrong for this project, such as `/api/categories`, `/api/tags`, `/api/authors`, `/api/pages`, or `/api/posts`.
- H2: The upload endpoint `/api/upload` is the endpoint returning `404`, not the content endpoints.
- H3: Strapi is not running at `http://localhost:3123`, so the request is hitting another service or an unavailable route.
- H4: The API token lacks access to the target route and Strapi or a proxy is returning `404` instead of `403`.
- H5: The script fails during the "check existing entry" lookup, where the REST query path or plural name does not match the real content API.

## Plan
- Instrument outbound Strapi requests and failures.
- Reproduce the migration locally.
- Identify the exact request path returning `404`.
- Apply the smallest fix after the evidence is clear.

## Evidence
- Instrumentation captured the first outbound request as `GET http://localhost:3123/api/categories?filters[slug][$eq]=uncategorized&pagination[pageSize]=1`.
- The reproduced migration failed with `AxiosError [AggregateError]` and `code: 'ECONNREFUSED'`.
- A direct probe to `http://localhost:3123/admin` returned `Unable to connect to the remote server`.

## Analysis
- H1 not confirmed: the request path itself looks valid for the current content-type plural names.
- H2 rejected: the failure happens before any upload request.
- H3 confirmed: Strapi is not reachable at `http://localhost:3123`.
- H4 rejected for now: there is no HTTP response from Strapi, so this is not a token-permission error.
- H5 rejected: the lookup path is reached, but the server connection fails before route resolution.

## Current Conclusion
- The current blocker is environment/runtime state, not migration mapping logic.
- Start the Strapi server at `http://localhost:3123` or update `STRAPI_URL` to the correct reachable Strapi instance, then rerun the migration.

## Additional Evidence
- After starting Strapi, the first real failing request was confirmed as `GET /api/categories`, which returned `404`.
- Static inspection showed `category`, `tag`, `author`, and `page` only had `schema.json`, while `post` had custom WordPress-only controller/service/route files that replaced core CRUD behavior.
- After restoring core API bindings, the migration progressed past the prior failure point and began creating categories, authors, and many pages successfully.

## Fix Applied
- Added core route files for `category`, `tag`, `author`, `page`, and `post`.
- Added core controller/service files for `category`, `tag`, `author`, and `page`.
- Updated the `post` controller and service to extend Strapi core CRUD behavior while preserving the custom WordPress helper methods.

## Pre vs Post
- Pre-fix: `GET /api/categories` returned `404` and the migration stopped immediately.
- Post-fix: the same migration proceeded to create content entries, proving the missing content API bindings were the cause.

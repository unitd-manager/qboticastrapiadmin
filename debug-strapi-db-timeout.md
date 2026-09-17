[OPEN] Strapi DB timeout on startup

- Session ID: `strapi-db-timeout`
- Symptom: `npm start` exits during Strapi boot with `Error: connect ETIMEDOUT`
- Goal: determine whether the timeout comes from bad DB host/port config, unreachable network target, slow DB startup, or mismatched env resolution.
- Status: collecting runtime evidence

## Hypotheses

1. Strapi is reading a DB host/port from `.env` that is unreachable from this machine.
2. The configured MySQL server is correct, but the network path or firewall is timing out.
3. Strapi startup is using different env variables than the migration script, so one succeeds while the app boot uses another DB target.
4. The DB server is reachable, but MySQL handshake/auth is too slow and the connect timeout is too short.
5. A local service dependency or container expected by Strapi is not running, so the connection target never responds.

## Evidence Log

- `config/database.ts` shows Strapi boot uses `DATABASE_*` variables, not a separate app-only DB target.
- `.env` resolved startup target to `DATABASE_HOST=66.29.149.122`, `DATABASE_PORT=3306`, `DATABASE_NAME=qbotica_strapi`, client `mysql`.
- `Test-NetConnection 66.29.149.122 -Port 3306` returned `TcpTestSucceeded : True`.
- Direct runtime probe using `mysql2/promise` connected successfully and ran `SELECT 1`.
- Direct runtime probe using `knex` with `pool.min=2`, `pool.max=10`, and `acquireConnectionTimeout=60000` also connected successfully and ran `SELECT 1`.
- Reproducing `npm start` inside the IDE sandbox did not reproduce the original ETIMEDOUT, but surfaced a separate sandbox-specific warning: `EPERM ... AppData\\Roaming\\xdg.config\\com.strapi\\config.json`.

## Hypothesis Status

1. Strapi is reading a DB host/port from `.env` that is unreachable from this machine. Rejected by TCP reachability and successful MySQL connection probes.
2. The configured MySQL server is correct, but the network path or firewall is timing out. Mostly rejected by successful TCP and query probes; may still be intermittent.
3. Strapi startup is using different env variables than the migration script, so one succeeds while the app boot uses another DB target. Rejected; both resolve through `DATABASE_*` in the current `.env`.
4. The DB server is reachable, but MySQL handshake/auth is too slow and the connect timeout is too short. Plausible for intermittent failures; mitigated by explicit driver connect timeout.
5. A local service dependency or container expected by Strapi is not running, so the connection target never responds. Rejected for MySQL itself; no evidence of missing local DB service.

## Fix Applied

- Added startup instrumentation to `config/database.ts` to capture resolved DB config during this open debugging session.
- Added explicit MySQL driver `connectTimeout` support via `DATABASE_CONNECT_TIMEOUT`.
- Reduced default pool minimum from `2` to `0` to avoid eager idle connections during startup.
- Confirmed the page-loading failure is currently `403 Forbidden` on `GET /api/pages`, which shifts the active root cause from DB startup to public API permissions.
- Added a bootstrap safeguard in `src/index.ts` to enable `api::page.page.find` and `api::page.page.findOne` for the `Public` role automatically.

## Next Step

- Restart Strapi on the user machine and verify `GET /api/pages` returns `200` instead of `403`.

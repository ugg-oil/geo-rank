<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

GEO Radar is a single Next.js 16 app (App Router, Turbopack) backed by PostgreSQL via Prisma 7 (`@prisma/adapter-pg`). Commands live in `package.json`; env/DB/deploy details are in `docs/ops/setup.md`. Only the non-obvious startup caveats are below.

- **PostgreSQL must be running locally and `.env` must exist** — the app hard-fails at import time without `DATABASE_URL` (see `src/lib/db.ts`). Start the apt cluster with `sudo pg_ctlcluster 16 main start` (systemd auto-start is blocked by `policy-rc.d` in this VM, so it will NOT come up on its own). A `georadar` role/db and a matching `.env` are already provisioned in the snapshot.
- **There is no `.env.example`** despite what `README.md`/`docs/ops/setup.md` say (`.env*` is gitignored). Minimum working `.env`: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, `PIPELINE_SECRET`, `CRON_SECRET`.
- **After schema edits** run `npm run db:push` (no migrations dir is used for local dev), then `npm run seed` to load the prompt catalog.
- **The weekly pipeline needs a paid external key** (`OPENROUTER_API_KEY`) — `npm run pipeline`, `collect-engine`, and `publish` all call OpenRouter, so they cannot run in this environment by default. The frontend reads ranking data straight from the `snapshots` table (DB is the source of truth), so with an empty DB the homepage shows no rankings and `/category/*` + `/brand/*` render an "unavailable"/404 state. That is expected without pipeline data, not a bug.
- **`/api/leads` is the best no-external-deps smoke test** of the full app→DB path: it writes a row to the `leads` table with no API keys required (same request the brand-page lead form fires).
- Dev server hot-reloads code, but **editing `.env` requires restarting `npm run dev`**.

# Agent Notes

## Commands

- Install with `npm install`; the repo uses `package-lock.json` and no separate package manager config.
- Run the API in dev with `npm run dev`; it starts `src/server/index.ts` on `PORT` using `tsx watch`.
- Run the dashboard dev server separately with `npm run dev:dashboard`; Vite's root is `dashboard/` and it proxies `/api` to `http://localhost:3000`.
- Use `npm run build` as the main verification before deploy; it runs `tsc -p tsconfig.json` for `src/` and then `vite build` to `dist/public`.
- `npm run typecheck` checks server/domain TS only. `dashboard/` is excluded from `tsconfig.json`; Vite bundles it but does not provide full dashboard typechecking.
- There is no test script or CI workflow in this repo right now.

## Architecture Boundaries

- Hermes is the agent/runtime owner: Google Calendar, Google Tasks, scheduled jobs/cron, reminders, memories, chat delivery, and AI-generated daily context belong in Hermes, not this app.
- Exec Assistant is a companion Express API plus React dashboard for goals, dashboard snapshots, and overview aggregation.
- Do not add Google OAuth, direct Google API flows, reminder engines, or memory systems here. Use Hermes and sync snapshot data through `/api/tools/dashboard/snapshot`.
- The app is intentionally single-user. `ownerProfileId` is fixed in `src/config.ts`; the legacy `profiles.whatsapp_number` DB column is filled with the internal `ownerHandle`, not a real WhatsApp number.

## API And Auth

- Public healthcheck is `GET /health`; production/Coolify expects port `3000`.
- Dashboard routes use `x-dashboard-token: <DASHBOARD_TOKEN>`; do not put dashboard tokens in URLs.
- Hermes tool routes live under `/api/tools` and require `Authorization: Bearer <HERMES_TOOL_TOKEN>`.
- Hermes should use `EXEC_ASSISTANT_TOKEN` with the same value as the app's `HERMES_TOOL_TOKEN`.

## Data Model Gotchas

- Run `supabase/schema.sql` manually in the self-hosted Supabase SQL editor for schema changes; there is no migration runner.
- RLS is enabled and `anon`/`authenticated` are explicitly denied on all app tables. Backend access uses `SUPABASE_SERVICE_ROLE_KEY` only.
- Dashboard snapshots store flexible JSON in `dashboard_snapshots.calendar_events`, `dashboard_snapshots.tasks`, `dashboard_snapshots.reminders`, `dashboard_snapshots.memories`, and `notes`; prefer extending the snapshot payload over adding tables unless history/querying requires it.
- `/api/tools/dashboard/snapshot` accepts flat `calendarEvents`/`tasks`, grouped `calendars`/`taskLists`, plus Hermes-owned `reminders` and `memories` highlights.

## Deployment

- Production is deployed by Coolify from the Dockerfile. The Docker image runs `npm run build` and `npm start`.
- The Dockerfile installs `curl`; keep it unless the Coolify healthcheck is changed.
- Generated output is `dist/` and should not be edited directly.

## Secrets

- Required runtime env is documented in `.env.example`: `APP_ENCRYPTION_KEY`, `DASHBOARD_TOKEN`, `HERMES_TOOL_TOKEN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Keep secrets runtime-only in Coolify when possible. Never commit real token/JWT/key values.

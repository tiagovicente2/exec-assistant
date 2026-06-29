# Exec Assistant

Hermes Agent companion service for a personal WhatsApp assistant.

Hermes handles the agent runtime, WhatsApp gateway, LLM provider, memory loop, skills, Google Workspace, and scheduled automations. This app is a companion service for structured state and the dashboard at `https://exec.arpgg.io`.

## Stack

- Hermes Agent for WhatsApp/chat/agent orchestration
- Node.js/TypeScript Express companion API
- Self-hosted Supabase for structured state
- Hermes Google Workspace for Google Calendar and Google Tasks
- React dashboard served by the same app
- Coolify Docker deployment

## Responsibility Split

- Hermes owns WhatsApp/chat delivery, recurring reminders, scheduled jobs, Google Calendar, Google Tasks, and proactive automations.
- Exec Assistant owns goals, saved memories, dashboard snapshots, overview aggregation, and optional dashboard-only reminder records.
- Prefer Hermes-native workflows over adding companion endpoints whenever Hermes can do the job directly.
- Do not use Exec Assistant as a recurrence engine. It does not run a scheduler or advance recurring reminders.

## First Deploy

1. Create self-hosted Supabase in Coolify.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` values into Coolify environment variables.
4. Deploy this app with the Dockerfile.
5. Visit `https://exec.arpgg.io?token=<DASHBOARD_TOKEN>` for the dashboard.
6. Install/configure Hermes Agent separately and add `skills/exec-assistant/SKILL.md` as a Hermes skill.
7. Set up Hermes Google Workspace for Calendar and Tasks.

## Local Development

```bash
npm install
npm run dev
```

In another terminal for Vite dashboard development:

```bash
npm run dev:dashboard
```

WhatsApp, proactive reminder delivery, recurring schedules, Calendar, and Tasks are handled by Hermes, not this companion app.

## Hermes Integration

Add these to Hermes' runtime environment:

```bash
export EXEC_ASSISTANT_URL="https://exec.arpgg.io"
export EXEC_ASSISTANT_TOKEN="same value as HERMES_TOOL_TOKEN"
```

Then install `skills/exec-assistant/SKILL.md` into Hermes. Hermes can call the companion API with `curl` from that skill.

If Hermes can access this GitHub repo, install it with:

```bash
hermes skills install tiagovicente2/exec-assistant/skills/exec-assistant --force
```

Or copy `skills/exec-assistant/SKILL.md` into `~/.hermes/skills/exec-assistant/SKILL.md` inside the Hermes home volume.

Core endpoints are under `/api/tools` and require `Authorization: Bearer <HERMES_TOOL_TOKEN>`. Use them for companion state, not for Hermes-native capabilities like recurring reminders or Google Workspace actions.

## Dashboard

Open:

```text
https://exec.arpgg.io?token=<DASHBOARD_TOKEN>
```

The dashboard shows:

- Goals progress
- Today's highlights
- Calendar summary
- Google Tasks
- Reminders due today

## Notes

This project is intentionally single-user. If you later want family/team use, add real user auth, Supabase RLS policies, and per-user Google OAuth tokens before expanding access.

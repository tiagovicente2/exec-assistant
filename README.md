# Exec Assistant

Hermes Agent companion service for a personal WhatsApp assistant.

Hermes handles the agent runtime, WhatsApp gateway, LLM provider, memory loop, skills, reminders, Google Workspace, and scheduled automations. This app is a companion service for goals, dashboard snapshots, and the dashboard at `https://exec.arpgg.io`.

## Stack

- Hermes Agent for WhatsApp/chat/agent orchestration
- Node.js/TypeScript Express companion API
- Self-hosted Supabase for dashboard/goal state
- Hermes Google Workspace for Google Calendar and Google Tasks
- React dashboard served by the same app
- Coolify Docker deployment

## Responsibility Split

- Hermes owns WhatsApp/chat delivery, reminders, saved memories, scheduled jobs, Google Calendar, Google Tasks, and proactive automations.
- Exec Assistant owns goals, dashboard snapshots, and overview aggregation.
- Hermes pushes dashboard snapshots containing calendar events, tasks, reminders, memory highlights, and notes.
- Exec Assistant can queue dashboard task/reminder actions; Hermes applies them through native Google/reminder tools and marks them processed.
- Hermes should push refreshed dashboard snapshots immediately after Calendar, Tasks, reminders, or dashboard memory highlights change.
- Prefer Hermes-native workflows over adding companion endpoints whenever Hermes can do the job directly.

## First Deploy

1. Create self-hosted Supabase in Coolify.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` values into Coolify environment variables.
4. Deploy this app with the Dockerfile.
5. Visit `https://exec.arpgg.io` and paste `DASHBOARD_TOKEN` into the dashboard form.
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

WhatsApp, memories, reminder delivery, recurring schedules, Calendar, and Tasks are handled by Hermes, not this companion app.

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

Core endpoints are under `/api/tools` and require `Authorization: Bearer <HERMES_TOOL_TOKEN>`. Use them for companion goals, dashboard snapshots, and dashboard action handoff. Apply task/reminder actions in Hermes-native systems, then acknowledge them in Exec Assistant.

## Dashboard

Open:

```text
https://exec.arpgg.io
```

Paste `DASHBOARD_TOKEN` into the access form. Do not put dashboard tokens in URLs; URLs can be stored in browser history, proxy logs, and analytics tools.

The dashboard shows:

- Goals progress
- Today's highlights
- Calendar summary
- Tasks with done/remove actions
- Reminders due today with done/remove actions
- Memory highlights

## Notes

This project is intentionally single-user. If you later want family/team use, add real user auth, Supabase RLS policies, and per-user Google OAuth tokens before expanding access.

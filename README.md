# Exec Assistant

Hermes Agent companion service for a personal WhatsApp assistant.

Hermes handles the agent runtime, WhatsApp gateway, LLM provider, memory loop, skills, and scheduled automations. This app provides the structured personal-assistant layer Hermes can call: goals, reminders, Google Calendar, Google Tasks, and a dashboard at `https://exec.arpgg.io`.

## Stack

- Hermes Agent for WhatsApp/chat/agent orchestration
- Node.js/TypeScript Express companion API
- Self-hosted Supabase for structured state
- Google Calendar and Google Tasks APIs
- React dashboard served by the same app
- Coolify Docker deployment

## First Deploy

1. Create self-hosted Supabase in Coolify.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Create Google OAuth credentials with callback `https://exec.arpgg.io/oauth/google/callback`.
4. Copy `.env.example` values into Coolify environment variables.
5. Deploy this app with the Dockerfile.
6. Visit `https://exec.arpgg.io?token=<DASHBOARD_TOKEN>` for the dashboard.
7. Click `Connect Google` from the dashboard and complete OAuth.
8. Install/configure Hermes Agent separately and add `hermes/exec-assistant-skill.md` as a Hermes skill/context file.

## Local Development

```bash
npm install
npm run dev
```

In another terminal for Vite dashboard development:

```bash
npm run dev:dashboard
```

WhatsApp is handled by Hermes, not this companion app.

## Hermes Integration

Add these to Hermes' runtime environment:

```bash
export EXEC_ASSISTANT_URL="https://exec.arpgg.io"
export EXEC_ASSISTANT_TOKEN="same value as HERMES_TOOL_TOKEN"
```

Then add `hermes/exec-assistant-skill.md` to Hermes as a skill or persistent context. Hermes can call the companion API with `curl` from that skill.

Core endpoints are under `/api/tools` and require `Authorization: Bearer <HERMES_TOOL_TOKEN>`.

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

---
name: exec-assistant
description: Manage Tiago's goals and sync Hermes-owned dashboard data into Exec Assistant.
version: 1.1.0
platforms: [linux]
metadata:
  hermes:
    tags: [personal-assistant, goals, dashboard]
    category: productivity
    requires_toolsets: [terminal]
required_environment_variables:
  - name: EXEC_ASSISTANT_URL
    prompt: Exec Assistant URL
    help: Usually https://exec.arpgg.io
    required_for: all functionality
  - name: EXEC_ASSISTANT_TOKEN
    prompt: Exec Assistant Hermes tool token
    help: Same value as HERMES_TOOL_TOKEN in the exec-assistant Coolify app.
    required_for: all functionality
---

# Exec Assistant

## When To Use

Use this skill when Tiago asks to manage goals, view/sync the dashboard overview, process dashboard task/reminder actions, or when the prompt is `sync-exec-assistant-dashboard-next-7-days-and-process-actions`.

Hermes remains the source of truth for WhatsApp, reminders, saved memories, Google Calendar, Google Tasks, scheduling, and proactive automations. Exec Assistant is a companion API for goals, dashboard snapshots, and dashboard action handoff.

## Rules

- Use Exec Assistant for goals, dashboard snapshots, and dashboard action handoff only.
- Use Hermes-native memory for preferences/facts; do not write memories to Exec Assistant.
- Use Hermes scheduled tasks/cron for reminders; do not create reminders in Exec Assistant.
- Use Hermes Google Workspace for Calendar and Tasks. Google commands should use `$GAPI ...`, not the Exec Assistant API.
- After any Hermes-native change to Calendar, Google Tasks, reminders, or relevant memories, immediately push refreshed Exec Assistant dashboard snapshots for the affected date(s).
- When Exec Assistant queues a task/reminder action, apply it through Hermes-native tools, then mark the action completed or failed and push refreshed snapshots for affected dates.
- Use `America/Sao_Paulo` as the default timezone.
- Send timestamps as ISO 8601 strings with timezone offsets.
- Ask a clarifying question before ambiguous calendar/task/reminder actions.
- Ask before destructive actions.
- Keep WhatsApp replies concise.

## Procedure

All Exec Assistant API requests include:

```bash
-H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN"
-H "Content-Type: application/json"
```

### Today Overview

```bash
curl -s "$EXEC_ASSISTANT_URL/api/tools/overview/today" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN"
```

### Goals

Create:

```bash
curl -s -X POST "$EXEC_ASSISTANT_URL/api/tools/goals" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Run 5km","targetDate":"2026-08-01","progress":0}'
```

List:

```bash
curl -s "$EXEC_ASSISTANT_URL/api/tools/goals?status=active" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN"
```

Update progress/status:

```bash
curl -s -X PATCH "$EXEC_ASSISTANT_URL/api/tools/goals/<goal-id>" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"progress":50}'
```

### Dashboard Action Handoff

The dashboard can queue `done` or `remove` actions for displayed tasks/reminders. Fetch pending actions, apply each action through Hermes-native Google Tasks or reminder tools, then acknowledge the action.

List pending actions:

```bash
curl -s "$EXEC_ASSISTANT_URL/api/tools/dashboard/actions" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN"
```

Mark completed:

```bash
curl -s -X PATCH "$EXEC_ASSISTANT_URL/api/tools/dashboard/actions/<action-id>" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

Mark failed:

```bash
curl -s -X PATCH "$EXEC_ASSISTANT_URL/api/tools/dashboard/actions/<action-id>" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"failed","errorMessage":"Could not find matching task"}'
```

### Push-On-Change Sync

Exec Assistant should be refreshed whenever Hermes changes data that appears on the dashboard.

After creating, updating, completing, or deleting any of these items, run a snapshot sync for every affected date:

- Google Calendar events: sync the event date and any date range it spans.
- Google Tasks: sync the due date if present; otherwise sync today.
- Reminders: sync the reminder due/scheduled date.
- Memories shown in dashboard highlights: sync today and the next 7 days.

If the change can affect multiple dashboard days or recurring items, sync today plus the next 7 days. Do this silently as a side effect after the user-facing action succeeds.

### Dashboard Snapshot Sync

After listing Calendar, Tasks, reminders, or useful memory highlights through Hermes-native tools, sync dashboard snapshots. Exec Assistant stores these as display/cache data only; Hermes remains the owner.

For `sync-exec-assistant-dashboard-next-7-days-and-process-actions`, do this automatically without chatting with Tiago:

1. Use Hermes-native Google Calendar, Google Tasks, reminders, and memory tools.
2. Build one snapshot per date for today and the next 7 days.
3. POST each date separately to `/api/tools/dashboard/snapshot` with the relevant `calendarEvents`, `tasks`/`taskLists`, `reminders`, `memories`, and `notes`.
4. Fetch `/api/tools/dashboard/actions` and process pending actions using Hermes-native task/reminder tools.
5. PATCH each processed action as `completed` or `failed`.

### Dashboard Snapshot Sync API

After listing Calendar, Tasks, reminders, or useful memory highlights through Hermes-native tools, sync a dashboard snapshot.

Flat payload:

```bash
curl -s -X POST "$EXEC_ASSISTANT_URL/api/tools/dashboard/snapshot" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-29","calendarEvents":[],"tasks":[],"reminders":[],"memories":[],"notes":"Synced from Hermes"}'
```

Grouped Calendar/Task payloads are also accepted:

```json
{
  "date": "2026-06-29",
  "calendars": [{ "title": "Personal", "events": [] }],
  "taskLists": [{ "title": "Inbox", "tasks": [] }],
  "reminders": [{ "id": "hermes-job-1", "message": "Call Ana", "remindAt": "2026-06-29T15:00:00-03:00" }],
  "memories": [{ "kind": "preference", "content": "Tiago prefers meetings after 10am" }],
  "notes": "Synced from Hermes Google Workspace"
}
```

## Verification

Run:

```bash
curl -s "$EXEC_ASSISTANT_URL/api/tools/overview/today" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN"
```

The response should be JSON with `date`, `timezone`, `highlights`, `goals`, `reminders`, `calendarEvents`, and `tasks`.

## Pitfalls

- If the API returns `401`, `EXEC_ASSISTANT_TOKEN` does not match `HERMES_TOOL_TOKEN`.
- If Google calls fail, set up Hermes' Google Workspace skill first.
- If reminders or memories need changes, use Hermes-native tools; Exec Assistant only displays synced snapshots.

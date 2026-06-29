---
name: exec-assistant
description: Manage Tiago's goals, memory, dashboard sync, and Hermes-native personal-assistant workflows.
version: 1.0.0
platforms: [linux]
metadata:
  hermes:
    tags: [personal-assistant, goals, reminders, dashboard]
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

Use this skill when Tiago asks to manage goals, reminders, saved memories, or day overview.

Prefer Hermes-native workflows whenever they exist. Exec Assistant is a companion API for structured state and dashboard data; Hermes remains the source of truth for chat delivery, scheduled automations, WhatsApp, Google Workspace, and agent behavior.

Use Hermes' bundled Google Workspace skill for Google Calendar and Google Tasks. Google commands should use `$GAPI ...`, not the Exec Assistant API.

## Rules

- Prefer Hermes-native capabilities over companion API endpoints.
- Use the companion API for goals, saved memories, overview reads, and dashboard snapshots.
- Use Hermes scheduled tasks/cron for reminders and recurring automations. Do not use Exec Assistant reminders for recurrence.
- Use `$GAPI calendar ...` and other Hermes Google Workspace commands for Google actions.
- Use `America/Sao_Paulo` as the default timezone.
- Send timestamps as ISO 8601 strings with timezone offsets.
- Ask a clarifying question before creating calendar events with ambiguous dates/times.
- Ask before destructive actions.
- Keep WhatsApp replies concise.

## Procedure

All requests include:

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

### Reminders

Use Hermes scheduled tasks/cron for reminder delivery.

For recurring reminders, create or update a Hermes scheduled job directly. Example intent:

```text
Daily at 08:00 America/Sao_Paulo, send Tiago: tomar remedio
```

For one-time reminders, prefer a Hermes scheduled job when possible so delivery remains in Hermes. Use Exec Assistant reminders only as optional dashboard state, never as the delivery mechanism.

Optional companion record for dashboard-only one-time reminders:

```bash
curl -s -X POST "$EXEC_ASSISTANT_URL/api/tools/reminders" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Call Ana","remindAt":"2026-06-29T15:00:00-03:00"}'
```

Do not send `recurrenceRule` for recurring reminders. The companion does not run a scheduler or advance recurring reminders.

Legacy polling, only if explicitly needed:

```bash
curl -s "$EXEC_ASSISTANT_URL/api/tools/reminders/due" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN"
```

After sending a due reminder through Hermes/WhatsApp, mark it sent:

```bash
curl -s -X POST "$EXEC_ASSISTANT_URL/api/tools/reminders/<id>/sent" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN"
```

### Memories

```bash
curl -s -X POST "$EXEC_ASSISTANT_URL/api/tools/memories" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind":"preference","content":"Tiago prefers meetings after 10am","importance":4}'
```

### Calendar With Hermes Google Workspace

List events:

```bash
$GAPI calendar list --start 2026-06-29T00:00:00-03:00 --end 2026-06-29T23:59:59-03:00
```

Create event:

```bash
$GAPI calendar create --summary "Gym" --start 2026-06-29T18:00:00-03:00 --end 2026-06-29T19:00:00-03:00
```

### Dashboard Snapshot Sync

After creating/listing Calendar events, sync today's dashboard with the JSON returned by `$GAPI calendar list`. If task data is unavailable, send an empty `tasks` array.

```bash
curl -s -X POST "$EXEC_ASSISTANT_URL/api/tools/dashboard/snapshot" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-29","calendarEvents":[],"tasks":[],"notes":"Synced from Hermes Google Workspace"}'
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
- If reminder creation fails, check that timestamps include timezone offset.

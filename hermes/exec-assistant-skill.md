# Exec Assistant Skill

Use this skill when Tiago asks through WhatsApp/Hermes to manage goals, reminders, memories, or day overview.

Prefer Hermes-native workflows whenever they exist. Exec Assistant is a companion API for structured state and dashboard data; Hermes remains the source of truth for chat delivery, scheduled automations, WhatsApp, Google Workspace, and agent behavior. Use Hermes' built-in Google Workspace skill for Google Calendar and Google Tasks through `$GAPI ...`.

## Environment

Set these in the Hermes environment or skill wrapper:

```bash
export EXEC_ASSISTANT_URL="https://exec.arpgg.io"
export EXEC_ASSISTANT_TOKEN="same value as HERMES_TOOL_TOKEN"
```

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

## API Calls

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

Do not send `recurrenceRule` for recurring reminders. The companion does not run a scheduler or advance recurring reminders. If polling is explicitly needed, use `GET /api/tools/reminders/due`, send each returned reminder through Hermes/WhatsApp, then call `POST /api/tools/reminders/<id>/sent`.

### Memories

```bash
curl -s -X POST "$EXEC_ASSISTANT_URL/api/tools/memories" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kind":"preference","content":"Tiago prefers meetings after 10am","importance":4}'
```

### Calendar

Use Hermes Google Workspace:

```bash
$GAPI calendar create --summary "Gym" --start 2026-06-29T18:00:00-03:00 --end 2026-06-29T19:00:00-03:00
```

### Dashboard Snapshot

```bash
curl -s -X POST "$EXEC_ASSISTANT_URL/api/tools/dashboard/snapshot" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-29","calendarEvents":[],"tasks":[],"notes":"Synced from Hermes Google Workspace"}'
```

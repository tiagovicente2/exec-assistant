# Exec Assistant Skill

Use this skill when Tiago asks through WhatsApp/Hermes to manage goals, reminders, memories, or day overview. Use Hermes' built-in Google Workspace skill for Google Calendar through `$GAPI calendar ...`.

## Environment

Set these in the Hermes environment or skill wrapper:

```bash
export EXEC_ASSISTANT_URL="https://exec.arpgg.io"
export EXEC_ASSISTANT_TOKEN="same value as HERMES_TOOL_TOKEN"
```

## Rules

- Use the companion API for durable goals, reminders, memories, and dashboard snapshots.
- Use `$GAPI calendar ...` for Calendar actions.
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

```bash
curl -s -X POST "$EXEC_ASSISTANT_URL/api/tools/reminders" \
  -H "Authorization: Bearer $EXEC_ASSISTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Call Ana","remindAt":"2026-06-29T15:00:00-03:00"}'
```

Hermes should use its own cron/scheduled automations to proactively send reminders. The companion stores reminder state for dashboard/overview. If polling is easier, use `GET /api/tools/reminders/due`, send each returned reminder through WhatsApp, then call `POST /api/tools/reminders/<id>/sent`.

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

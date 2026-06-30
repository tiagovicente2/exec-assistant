import { DateTime } from "luxon";
import { config } from "../config.js";
import { listDashboardActions } from "./dashboardActions.js";
import { listGoals } from "./goals.js";
import { getTodaySnapshot } from "./dashboardSnapshot.js";

type JsonRecord = Record<string, unknown>;
type NormalizedTask = JsonRecord & { path: string; listTitle: string; title: string; due?: string; completed: boolean };
type NormalizedEvent = JsonRecord & { calendarTitle: string; summary: string; startValue?: string };
type NormalizedReminder = JsonRecord & { id: string; message: string; remind_at: string; timezone: string; source: "hermes" };

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function titleFrom(record: JsonRecord, fallback: string) {
  return stringValue(record.title) ?? stringValue(record.summary) ?? stringValue(record.name) ?? stringValue(record.description) ?? fallback;
}

function isHiddenTask(task: JsonRecord) {
  return task.hidden === true;
}

function isCompletedTask(task: JsonRecord) {
  return task.status === "completed" || task.completed === true || typeof task.completed === "string";
}

function taskDueDate(task: JsonRecord) {
  return stringValue(task.due) ?? stringValue(task.dueDate) ?? stringValue(task.remindAt) ?? stringValue(task.remind_at);
}

function taskCollection(value: JsonRecord) {
  if (Array.isArray(value.tasks)) return value.tasks;
  if (Array.isArray(value.items)) return value.items;
  return null;
}

function normalizeTask(task: unknown, path: string, listTitle: string): NormalizedTask | null {
  if (!isRecord(task) || isHiddenTask(task)) return null;
  return {
    ...task,
    path,
    listTitle,
    title: titleFrom(task, "Untitled task"),
    due: taskDueDate(task),
    completed: isCompletedTask(task)
  };
}

function normalizeTaskLists(rawTasks: unknown[]) {
  const lists: { id?: string; title: string; tasks: NormalizedTask[] }[] = [];
  const flatTasks: NormalizedTask[] = [];

  rawTasks.forEach((entry, index) => {
    if (!isRecord(entry)) return;
    const nested = taskCollection(entry);
    if (!nested) {
      const task = normalizeTask(entry, String(index), "Tasks");
      if (task) flatTasks.push(task);
      return;
    }

    const listTitle = titleFrom(entry, `Task list ${lists.length + 1}`);
    const tasks = nested
      .map((task, taskIndex) => normalizeTask(task, `${index}.${taskIndex}`, listTitle))
      .filter((task): task is NormalizedTask => !!task);
    lists.push({ id: stringValue(entry.id), title: listTitle, tasks });
  });

  if (flatTasks.length > 0) lists.unshift({ title: "Tasks", tasks: flatTasks });
  return lists;
}

function eventCollection(value: JsonRecord) {
  if (Array.isArray(value.events)) return value.events;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.calendarEvents)) return value.calendarEvents;
  return null;
}

function eventStart(event: JsonRecord) {
  if (isRecord(event.start)) return stringValue(event.start.dateTime) ?? stringValue(event.start.date);
  return stringValue(event.start) ?? stringValue(event.startTime) ?? stringValue(event.start_at);
}

function normalizeEvent(event: unknown, calendarTitle: string): NormalizedEvent | null {
  if (!isRecord(event)) return null;
  return {
    ...event,
    calendarTitle,
    summary: titleFrom(event, "Untitled event"),
    startValue: eventStart(event)
  };
}

function normalizeCalendars(rawEvents: unknown[]) {
  const calendars: { id?: string; title: string; events: NormalizedEvent[] }[] = [];
  const flatEvents: NormalizedEvent[] = [];

  rawEvents.forEach((entry) => {
    if (!isRecord(entry)) return;
    const nested = eventCollection(entry);
    if (!nested) {
      const event = normalizeEvent(entry, "Calendar");
      if (event) flatEvents.push(event);
      return;
    }

    const title = titleFrom(entry, `Calendar ${calendars.length + 1}`);
    const events = nested
      .map((event) => normalizeEvent(event, title))
      .filter((event): event is NormalizedEvent => !!event)
      .sort((a, b) => String(a.startValue ?? "").localeCompare(String(b.startValue ?? "")));
    calendars.push({ id: stringValue(entry.id), title, events });
  });

  if (flatEvents.length > 0) calendars.unshift({ title: "Calendar", events: flatEvents });
  return calendars;
}

function reminderTime(reminder: JsonRecord) {
  return stringValue(reminder.remind_at) ?? stringValue(reminder.remindAt) ?? stringValue(reminder.due) ?? stringValue(reminder.scheduledAt) ?? stringValue(reminder.time);
}

function isActiveReminder(reminder: JsonRecord) {
  return reminder.hidden !== true && reminder.status !== "sent" && reminder.status !== "cancelled" && reminder.status !== "completed";
}

function normalizeReminder(reminder: unknown, index: number): NormalizedReminder | null {
  if (!isRecord(reminder) || !isActiveReminder(reminder)) return null;
  const remindAt = reminderTime(reminder);
  if (!remindAt) return null;
  return {
    ...reminder,
    id: stringValue(reminder.id) ?? `hermes-${index}`,
    message: stringValue(reminder.message) ?? titleFrom(reminder, "Untitled reminder"),
    remind_at: remindAt,
    timezone: stringValue(reminder.timezone) ?? config.DEFAULT_TIMEZONE,
    source: "hermes"
  };
}

function actionMetadata(action: JsonRecord) {
  return isRecord(action.metadata) ? action.metadata : {};
}

function actionTargetId(action: JsonRecord) {
  return stringValue(action.target_id) ?? stringValue(actionMetadata(action).targetId);
}

function actionTargetPath(action: JsonRecord) {
  return stringValue(actionMetadata(action).targetPath);
}

function isQueuedFor(action: JsonRecord, targetType: "task" | "reminder", item: { id?: string; path?: string }) {
  const actionType = stringValue(action.target_type) ?? stringValue(action.targetType);
  if (actionType !== targetType) return false;
  const targetId = actionTargetId(action);
  const targetPath = actionTargetPath(action);
  return (!!item.id && targetId === item.id) || (!!item.path && (targetPath === item.path || targetId === item.path));
}

function filterQueuedActions<T extends { id?: string; path?: string }>(items: T[], actions: JsonRecord[], targetType: "task" | "reminder") {
  return items.filter((item) => !actions.some((action) => isQueuedFor(action, targetType, item)));
}

function normalizeReminders(rawReminders: unknown[], now: DateTime) {
  return rawReminders
    .map((reminder, index) => normalizeReminder(reminder, index))
    .filter((reminder): reminder is NormalizedReminder => !!reminder)
    .filter((reminder) => {
      const remindAt = DateTime.fromISO(reminder.remind_at, { zone: config.DEFAULT_TIMEZONE });
      return remindAt.isValid ? remindAt <= now.endOf("day") : true;
    })
    .sort((a, b) => a.remind_at.localeCompare(b.remind_at));
}

export async function todayOverview() {
  const now = DateTime.now().setZone(config.DEFAULT_TIMEZONE);
  const [goals, snapshot, pendingActions] = await Promise.all([listGoals("active"), getTodaySnapshot(), listDashboardActions("pending")]);
  const queuedActions = pendingActions.filter(isRecord);
  const dueReminders = filterQueuedActions(normalizeReminders((snapshot?.reminders as unknown[] | null) ?? [], now), queuedActions, "reminder");
  const calendars = normalizeCalendars((snapshot?.calendar_events as unknown[] | null) ?? []);
  const calendarEvents = calendars.flatMap((calendar) => calendar.events);
  const taskLists = normalizeTaskLists((snapshot?.tasks as unknown[] | null) ?? []);
  const allTasks = taskLists.flatMap((list) => list.tasks);
  const tasks = filterQueuedActions(allTasks.filter((task) => !task.completed), queuedActions, "task");
  const completedTasks = allTasks.filter((task) => task.completed);
  const overdueTasks = tasks.filter((task) => {
    const due = taskDueDate(task);
    return due ? DateTime.fromISO(due).isValid && DateTime.fromISO(due) < now.startOf("day") : false;
  });
  const dueTodayTasks = tasks.filter((task) => {
    const due = taskDueDate(task);
    return due ? DateTime.fromISO(due).isValid && DateTime.fromISO(due).hasSame(now, "day") : false;
  });
  const goalAverageProgress = goals.length > 0 ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0;
  const nextEvent = calendarEvents.find((event) => stringValue(event.startValue) && DateTime.fromISO(String(event.startValue)) >= now);

  const highlights = [
    `${calendarEvents.length} event${calendarEvents.length === 1 ? "" : "s"} across ${calendars.length} calendar${calendars.length === 1 ? "" : "s"}`,
    `${tasks.length} open task${tasks.length === 1 ? "" : "s"} across ${taskLists.length} list${taskLists.length === 1 ? "" : "s"}`,
    `${dueReminders.length} reminder${dueReminders.length === 1 ? "" : "s"} due today`,
    `${goalAverageProgress}% average goal progress`
  ];

  return {
    date: now.toISODate(),
    timezone: config.DEFAULT_TIMEZONE,
    google: { connected: true, error: null, source: "hermes-google-workspace", syncedAt: snapshot?.updated_at ?? null },
    highlights,
    goals,
    reminders: dueReminders,
    memories: (snapshot?.memories as unknown[] | null) ?? [],
    calendars,
    calendarEvents,
    taskLists,
    tasks,
    stats: {
      calendarCount: calendars.length,
      eventCount: calendarEvents.length,
      taskListCount: taskLists.length,
      taskCount: allTasks.length,
      openTaskCount: tasks.length,
      completedTaskCount: completedTasks.length,
      overdueTaskCount: overdueTasks.length,
      dueTodayTaskCount: dueTodayTasks.length,
      reminderCount: dueReminders.length,
      memoryCount: Array.isArray(snapshot?.memories) ? snapshot.memories.length : 0,
      goalAverageProgress,
      nextEventAt: stringValue(nextEvent?.startValue) ?? null
    },
    notes: snapshot?.notes ?? null
  };
}

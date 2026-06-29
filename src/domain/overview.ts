import { DateTime } from "luxon";
import { config } from "../config.js";
import { listGoals } from "./goals.js";
import { listReminders } from "./reminders.js";
import { getTodaySnapshot } from "./dashboardSnapshot.js";

export async function todayOverview() {
  const now = DateTime.now().setZone(config.DEFAULT_TIMEZONE);
  const [goals, reminders, snapshot] = await Promise.all([listGoals("active"), listReminders("scheduled"), getTodaySnapshot()]);
  const dueReminders = reminders.filter((reminder) => DateTime.fromISO(reminder.remind_at) <= now.endOf("day"));
  const calendarEvents = (snapshot?.calendar_events as unknown[] | null) ?? [];
  const tasks = (snapshot?.tasks as unknown[] | null) ?? [];

  const highlights = [
    `${calendarEvents.length} calendar event${calendarEvents.length === 1 ? "" : "s"} today`,
    `${tasks.length} open Google Task${tasks.length === 1 ? "" : "s"}`,
    `${dueReminders.length} reminder${dueReminders.length === 1 ? "" : "s"} due today`,
    `${goals.length} active goal${goals.length === 1 ? "" : "s"}`
  ];

  return {
    date: now.toISODate(),
    timezone: config.DEFAULT_TIMEZONE,
    google: { connected: true, error: null, source: "hermes-google-workspace", syncedAt: snapshot?.updated_at ?? null },
    highlights,
    goals,
    reminders: dueReminders,
    calendarEvents,
    tasks,
    notes: snapshot?.notes ?? null
  };
}

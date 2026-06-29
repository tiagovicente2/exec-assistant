import { DateTime } from "luxon";
import { config } from "../config.js";
import { listGoals } from "./goals.js";
import { listReminders } from "./reminders.js";
import { googleConnectionStatus, listCalendarEvents, listTasks } from "../integrations/google.js";

export async function todayOverview() {
  const now = DateTime.now().setZone(config.DEFAULT_TIMEZONE);
  const start = now.startOf("day").toUTC().toISO()!;
  const end = now.endOf("day").toUTC().toISO()!;
  const googleStatus = await googleConnectionStatus();

  const [goals, reminders] = await Promise.all([listGoals("active"), listReminders("scheduled")]);
  const dueReminders = reminders.filter((reminder) => DateTime.fromISO(reminder.remind_at) <= now.endOf("day"));

  let calendarEvents: unknown[] = [];
  let tasks: unknown[] = [];
  let googleError: string | null = null;

  if (googleStatus.connected) {
    try {
      [calendarEvents, tasks] = await Promise.all([listCalendarEvents({ start, end, maxResults: 12 }), listTasks(20)]);
    } catch (error) {
      googleError = error instanceof Error ? error.message : "Google integration failed";
    }
  }

  const highlights = [
    `${calendarEvents.length} calendar event${calendarEvents.length === 1 ? "" : "s"} today`,
    `${tasks.length} open Google Task${tasks.length === 1 ? "" : "s"}`,
    `${dueReminders.length} reminder${dueReminders.length === 1 ? "" : "s"} due today`,
    `${goals.length} active goal${goals.length === 1 ? "" : "s"}`
  ];

  return {
    date: now.toISODate(),
    timezone: config.DEFAULT_TIMEZONE,
    google: { ...googleStatus, error: googleError },
    highlights,
    goals,
    reminders: dueReminders,
    calendarEvents,
    tasks
  };
}

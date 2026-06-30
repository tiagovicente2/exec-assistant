import { DateTime } from "luxon";
import { config, ownerProfileId } from "../config.js";
import { supabase } from "../integrations/supabase.js";
import { ensureOwnerProfile } from "./profile.js";

export async function getDashboardSnapshot(date?: string | null) {
  const snapshotDate = date ?? DateTime.now().setZone(config.DEFAULT_TIMEZONE).toISODate();
  const { data, error } = await supabase
    .from("dashboard_snapshots")
    .select("snapshot_date, calendar_events, tasks, reminders, memories, notes, updated_at")
    .eq("profile_id", ownerProfileId)
    .eq("snapshot_date", snapshotDate)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTodaySnapshot() {
  return getDashboardSnapshot();
}

export async function upsertDashboardSnapshot(input: {
  date?: string;
  calendarEvents?: unknown[];
  calendars?: unknown[];
  tasks?: unknown[];
  taskLists?: unknown[];
  reminders?: unknown[];
  memories?: unknown[];
  notes?: string | null;
}) {
  await ensureOwnerProfile();

  const snapshotDate = input.date ?? DateTime.now().setZone(config.DEFAULT_TIMEZONE).toISODate();
  const calendarEvents = input.calendars && input.calendars.length > 0 ? input.calendars : input.calendarEvents ?? [];
  const tasks = input.taskLists && input.taskLists.length > 0 ? input.taskLists : input.tasks ?? [];
  const { data, error } = await supabase
    .from("dashboard_snapshots")
    .upsert(
      {
        profile_id: ownerProfileId,
        snapshot_date: snapshotDate,
        calendar_events: calendarEvents,
        tasks,
        reminders: input.reminders ?? [],
        memories: input.memories ?? [],
        notes: input.notes ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "profile_id,snapshot_date" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

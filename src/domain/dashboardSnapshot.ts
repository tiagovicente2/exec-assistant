import { DateTime } from "luxon";
import { config, ownerProfileId } from "../config.js";
import { supabase } from "../integrations/supabase.js";
import { ensureOwnerProfile } from "./profile.js";

export async function getTodaySnapshot() {
  const date = DateTime.now().setZone(config.DEFAULT_TIMEZONE).toISODate();
  const { data, error } = await supabase
    .from("dashboard_snapshots")
    .select("snapshot_date, calendar_events, tasks, notes, updated_at")
    .eq("profile_id", ownerProfileId)
    .eq("snapshot_date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateTodaySnapshotTask(index: number, patch: Record<string, unknown>) {
  const snapshot = await getTodaySnapshot();
  if (!snapshot) throw new Error("No dashboard snapshot found for today");

  const tasks = ((snapshot.tasks as unknown[] | null) ?? []).map((task) =>
    task && typeof task === "object" && !Array.isArray(task) ? { ...task } as Record<string, unknown> : task
  );
  if (!Number.isInteger(index) || index < 0 || index >= tasks.length) throw new Error("Task not found");

  const current = tasks[index];
  if (!current || typeof current !== "object" || Array.isArray(current)) throw new Error("Task is not editable");
  tasks[index] = { ...current, ...patch };

  const { data, error } = await supabase
    .from("dashboard_snapshots")
    .update({ tasks, updated_at: new Date().toISOString() })
    .eq("profile_id", ownerProfileId)
    .eq("snapshot_date", snapshot.snapshot_date)
    .select("snapshot_date, tasks, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function removeTodaySnapshotTask(index: number) {
  const snapshot = await getTodaySnapshot();
  if (!snapshot) throw new Error("No dashboard snapshot found for today");

  const tasks = [...((snapshot.tasks as unknown[] | null) ?? [])];
  if (!Number.isInteger(index) || index < 0 || index >= tasks.length) throw new Error("Task not found");
  tasks.splice(index, 1);

  const { data, error } = await supabase
    .from("dashboard_snapshots")
    .update({ tasks, updated_at: new Date().toISOString() })
    .eq("profile_id", ownerProfileId)
    .eq("snapshot_date", snapshot.snapshot_date)
    .select("snapshot_date, tasks, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function upsertDashboardSnapshot(input: { date?: string; calendarEvents?: unknown[]; tasks?: unknown[]; notes?: string | null }) {
  await ensureOwnerProfile();

  const snapshotDate = input.date ?? DateTime.now().setZone(config.DEFAULT_TIMEZONE).toISODate();
  const { data, error } = await supabase
    .from("dashboard_snapshots")
    .upsert(
      {
        profile_id: ownerProfileId,
        snapshot_date: snapshotDate,
        calendar_events: input.calendarEvents ?? [],
        tasks: input.tasks ?? [],
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

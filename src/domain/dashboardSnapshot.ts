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

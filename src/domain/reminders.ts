import { DateTime } from "luxon";
import { config, ownerProfileId } from "../config.js";
import { supabase } from "../integrations/supabase.js";
import { ensureOwnerProfile } from "./profile.js";

export async function createReminder(input: { message: string; remindAt: string; recurrenceRule?: string }) {
  await ensureOwnerProfile();

  const remindAt = DateTime.fromISO(input.remindAt, { zone: config.DEFAULT_TIMEZONE });
  if (!remindAt.isValid) throw new Error("Invalid reminder date");

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      profile_id: ownerProfileId,
      message: input.message,
      remind_at: remindAt.toUTC().toISO(),
      timezone: config.DEFAULT_TIMEZONE,
      recurrence_rule: input.recurrenceRule ?? null,
      status: "scheduled"
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listReminders(status = "scheduled") {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("profile_id", ownerProfileId)
    .eq("status", status)
    .order("remind_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function dueReminders() {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("profile_id", ownerProfileId)
    .eq("status", "scheduled")
    .lte("remind_at", new Date().toISOString())
    .order("remind_at", { ascending: true })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function markReminderSent(id: string) {
  const { error } = await supabase.from("reminders").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function cancelReminder(id: string) {
  const { data, error } = await supabase
    .from("reminders")
    .update({ status: "cancelled" })
    .eq("profile_id", ownerProfileId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

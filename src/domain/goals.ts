import { ownerProfileId } from "../config.js";
import { supabase } from "../integrations/supabase.js";

export async function createGoal(input: { title: string; description?: string; targetDate?: string; progress?: number }) {
  const { data, error } = await supabase
    .from("goals")
    .insert({
      profile_id: ownerProfileId,
      title: input.title,
      description: input.description ?? null,
      target_date: input.targetDate ?? null,
      progress: input.progress ?? 0,
      status: "active"
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listGoals(status?: string) {
  let query = supabase.from("goals").select("*").eq("profile_id", ownerProfileId).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateGoal(input: { id: string; title?: string; description?: string; status?: string; targetDate?: string; progress?: number }) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) patch.status = input.status;
  if (input.targetDate !== undefined) patch.target_date = input.targetDate;
  if (input.progress !== undefined) patch.progress = input.progress;

  const { data, error } = await supabase
    .from("goals")
    .update(patch)
    .eq("profile_id", ownerProfileId)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

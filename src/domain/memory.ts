import { ownerProfileId } from "../config.js";
import { supabase } from "../integrations/supabase.js";

export async function saveMemory(input: { kind?: string; content: string; importance?: number; sourceMessageId?: string }) {
  const { data, error } = await supabase
    .from("memories")
    .insert({
      profile_id: ownerProfileId,
      kind: input.kind ?? "preference",
      content: input.content,
      importance: input.importance ?? 3,
      source_message_id: input.sourceMessageId ?? null
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function searchMemories(query?: string) {
  let request = supabase.from("memories").select("*").eq("profile_id", ownerProfileId).order("importance", { ascending: false }).limit(20);
  if (query) request = request.ilike("content", `%${query}%`);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

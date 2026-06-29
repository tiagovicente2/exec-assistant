import { ownerProfileId } from "../config.js";
import { supabase } from "../integrations/supabase.js";

export async function saveConversationMessage(input: { whatsappMessageId?: string; role: "user" | "assistant"; content: string }) {
  const { error } = await supabase.from("conversation_messages").insert({
    profile_id: ownerProfileId,
    whatsapp_message_id: input.whatsappMessageId ?? null,
    role: input.role,
    content: input.content
  });
  if (error) throw error;
}

export async function recentConversation(limit = 12) {
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("role, content")
    .eq("profile_id", ownerProfileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse();
}

import { ownerHandle, ownerProfileId } from "../config.js";
import { supabase } from "../integrations/supabase.js";

export async function ensureOwnerProfile() {
  const { error } = await supabase.from("profiles").upsert({
    id: ownerProfileId,
    whatsapp_number: ownerHandle,
    display_name: "Tiago"
  });

  if (error) throw error;
}

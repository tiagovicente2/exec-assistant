import { config, ownerProfileId } from "../config.js";
import { supabase } from "../integrations/supabase.js";

export async function ensureOwnerProfile() {
  const { error } = await supabase.from("profiles").upsert({
    id: ownerProfileId,
    whatsapp_number: config.OWNER_WHATSAPP_NUMBER,
    display_name: "Tiago"
  });

  if (error) throw error;
}

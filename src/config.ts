import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url().default("https://exec.arpgg.io"),
  OWNER_WHATSAPP_NUMBER: z.string().min(6),
  DEFAULT_TIMEZONE: z.string().default("America/Sao_Paulo"),
  APP_ENCRYPTION_KEY: z.string().min(16),
  DASHBOARD_TOKEN: z.string().min(20),
  HERMES_TOOL_TOKEN: z.string().min(20),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)
});

export const config = schema.parse(process.env);

export const ownerProfileId = "00000000-0000-0000-0000-000000000001";

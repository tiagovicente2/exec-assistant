import { google } from "googleapis";
import { DateTime } from "luxon";
import { config, ownerProfileId } from "../config.js";
import { supabase } from "./supabase.js";
import { decryptSecret, encryptSecret } from "../security/crypto.js";
import { createSignedState, verifySignedState } from "../security/tokens.js";
import { ensureOwnerProfile } from "../domain/profile.js";

const scopes = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/tasks"];

function requireGoogleConfig() {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth env vars are not configured");
  }
}

function oauthClient() {
  requireGoogleConfig();
  return new google.auth.OAuth2(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
}

export function googleAuthUrl() {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state: createSignedState()
  });
}

export async function storeGoogleCallback(code: string, state: string | undefined) {
  if (!verifySignedState(state)) throw new Error("Invalid Google OAuth state");
  await ensureOwnerProfile();

  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token && !tokens.access_token) throw new Error("Google did not return OAuth tokens");

  const { data: existing, error: readError } = await supabase
    .from("google_tokens")
    .select("refresh_token_encrypted")
    .eq("profile_id", ownerProfileId)
    .maybeSingle();
  if (readError) throw readError;

  const refreshToken = tokens.refresh_token ?? (existing?.refresh_token_encrypted ? decryptSecret(existing.refresh_token_encrypted) : undefined);
  if (!refreshToken) throw new Error("Google refresh token is missing. Re-run consent with prompt=consent.");

  const { error } = await supabase
    .from("google_tokens")
    .upsert(
      {
        profile_id: ownerProfileId,
        access_token_encrypted: tokens.access_token ? encryptSecret(tokens.access_token) : null,
        refresh_token_encrypted: encryptSecret(refreshToken),
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scopes,
        updated_at: new Date().toISOString()
      },
      { onConflict: "profile_id" }
    );
  if (error) throw error;
}

async function authedClient() {
  const { data, error } = await supabase
    .from("google_tokens")
    .select("access_token_encrypted, refresh_token_encrypted, expires_at")
    .eq("profile_id", ownerProfileId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.refresh_token_encrypted) throw new Error("Google account is not connected");

  const client = oauthClient();
  client.setCredentials({
    access_token: data.access_token_encrypted ? decryptSecret(data.access_token_encrypted) : undefined,
    refresh_token: decryptSecret(data.refresh_token_encrypted),
    expiry_date: data.expires_at ? new Date(data.expires_at).getTime() : undefined
  });
  return client;
}

export async function googleConnectionStatus() {
  const { data, error } = await supabase.from("google_tokens").select("id, updated_at").eq("profile_id", ownerProfileId).maybeSingle();
  if (error) throw error;
  return { connected: Boolean(data), updatedAt: data?.updated_at ?? null };
}

export async function listCalendarEvents(input: { start: string; end: string; maxResults?: number }) {
  const calendar = google.calendar({ version: "v3", auth: await authedClient() });
  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: input.start,
    timeMax: input.end,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: input.maxResults ?? 10
  });
  return response.data.items ?? [];
}

export async function createCalendarEvent(input: { title: string; start: string; end: string; description?: string; location?: string }) {
  const calendar = google.calendar({ version: "v3", auth: await authedClient() });
  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.title,
      description: input.description,
      location: input.location,
      start: { dateTime: DateTime.fromISO(input.start).toISO() ?? input.start, timeZone: config.DEFAULT_TIMEZONE },
      end: { dateTime: DateTime.fromISO(input.end).toISO() ?? input.end, timeZone: config.DEFAULT_TIMEZONE }
    }
  });
  return response.data;
}

export async function listTasks(maxResults = 20) {
  const tasks = google.tasks({ version: "v1", auth: await authedClient() });
  const response = await tasks.tasks.list({ tasklist: "@default", showCompleted: false, maxResults });
  return response.data.items ?? [];
}

export async function createTask(input: { title: string; notes?: string; due?: string }) {
  const tasks = google.tasks({ version: "v1", auth: await authedClient() });
  const response = await tasks.tasks.insert({
    tasklist: "@default",
    requestBody: {
      title: input.title,
      notes: input.notes,
      due: input.due ? DateTime.fromISO(input.due).toUTC().toISO() ?? input.due : undefined
    }
  });
  return response.data;
}

export async function completeTask(taskId: string) {
  const tasks = google.tasks({ version: "v1", auth: await authedClient() });
  const current = await tasks.tasks.get({ tasklist: "@default", task: taskId });
  const response = await tasks.tasks.update({
    tasklist: "@default",
    task: taskId,
    requestBody: { ...current.data, status: "completed", completed: new Date().toISOString() }
  });
  return response.data;
}

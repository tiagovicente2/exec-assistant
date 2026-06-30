import { DateTime } from "luxon";
import { config, ownerProfileId } from "../config.js";
import { supabase } from "../integrations/supabase.js";
import { ensureOwnerProfile } from "./profile.js";
import { getTodaySnapshot } from "./dashboardSnapshot.js";

type DashboardActionTarget = "task" | "reminder";
type DashboardActionName = "done" | "remove";
type DashboardActionStatus = "pending" | "completed" | "failed";
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function childCollection(record: JsonRecord) {
  if (Array.isArray(record.tasks)) return record.tasks;
  if (Array.isArray(record.items)) return record.items;
  return null;
}

function itemMatches(item: unknown, targetId?: string) {
  return isRecord(item) && !!targetId && stringValue(item.id) === targetId;
}

function findItemById(items: unknown[], targetId?: string): JsonRecord | null {
  for (const item of items) {
    if (itemMatches(item, targetId)) return item as JsonRecord;
    if (isRecord(item)) {
      const children = childCollection(item);
      if (children) {
        const match = findItemById(children, targetId);
        if (match) return match;
      }
    }
  }
  return null;
}

function findItemByPath(items: unknown[], targetPath?: string): JsonRecord | null {
  if (!targetPath) return null;
  const indexes = targetPath.split(".").map((part) => Number(part));
  if (indexes.some((index) => !Number.isInteger(index) || index < 0)) return null;

  let current: unknown = items[indexes[0]];
  for (const index of indexes.slice(1)) {
    if (!isRecord(current)) return null;
    const children = childCollection(current);
    if (!children) return null;
    current = children[index];
  }
  return isRecord(current) ? current : null;
}

function applyItemAction(item: JsonRecord, targetType: DashboardActionTarget, action: DashboardActionName) {
  if (action === "remove") {
    item.hidden = true;
    item.status = targetType === "reminder" ? "cancelled" : stringValue(item.status) ?? "hidden";
    return;
  }

  item.status = "completed";
  if (targetType === "task") item.completed = true;
}

async function applyActionToTodaySnapshot(input: {
  targetType: DashboardActionTarget;
  action: DashboardActionName;
  targetId?: string;
  targetPath?: string;
}) {
  const snapshot = await getTodaySnapshot();
  if (!snapshot) return;

  const column = input.targetType === "task" ? "tasks" : "reminders";
  const items = structuredClone((snapshot[column] as unknown[] | null) ?? []);
  const item = findItemByPath(items, input.targetPath) ?? findItemById(items, input.targetId);
  if (!item) return;

  applyItemAction(item, input.targetType, input.action);

  const { error } = await supabase
    .from("dashboard_snapshots")
    .update({ [column]: items, updated_at: new Date().toISOString() })
    .eq("profile_id", ownerProfileId)
    .eq("snapshot_date", snapshot.snapshot_date);
  if (error) throw error;
}

export async function createDashboardAction(input: {
  targetType: DashboardActionTarget;
  action: DashboardActionName;
  targetId?: string;
  targetPath?: string;
  title?: string;
}) {
  await ensureOwnerProfile();

  const metadata = {
    targetId: input.targetId ?? null,
    targetPath: input.targetPath ?? null,
    title: input.title ?? null,
    requestedAt: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("dashboard_actions")
    .insert({
      profile_id: ownerProfileId,
      action_date: DateTime.now().setZone(config.DEFAULT_TIMEZONE).toISODate(),
      target_type: input.targetType,
      target_id: input.targetId ?? input.targetPath ?? null,
      action: input.action,
      status: "pending",
      metadata
    })
    .select("*")
    .single();
  if (error) throw error;

  await applyActionToTodaySnapshot(input);
  return data;
}

export async function listDashboardActions(status: DashboardActionStatus = "pending") {
  const { data, error } = await supabase
    .from("dashboard_actions")
    .select("*")
    .eq("profile_id", ownerProfileId)
    .eq("status", status)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateDashboardAction(input: { id: string; status: DashboardActionStatus; errorMessage?: string | null }) {
  const { data, error } = await supabase
    .from("dashboard_actions")
    .update({
      status: input.status,
      error_message: input.errorMessage ?? null,
      processed_at: input.status === "pending" ? null : new Date().toISOString()
    })
    .eq("profile_id", ownerProfileId)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

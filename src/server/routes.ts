import express from "express";
import { z } from "zod";
import { config } from "../config.js";
import { createGoal, listGoals, updateGoal } from "../domain/goals.js";
import { saveMemory, searchMemories } from "../domain/memory.js";
import { cancelReminder, createReminder, dueReminders, listReminders, markReminderSent } from "../domain/reminders.js";
import { todayOverview } from "../domain/overview.js";
import { upsertDashboardSnapshot } from "../domain/dashboardSnapshot.js";
import { requireDashboardToken, requireHermesToolToken } from "./auth.js";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "exec-assistant", mode: "hermes-companion" });
});

router.get("/api/dashboard", requireDashboardToken, async (_req, res, next) => {
  try {
    res.json(await todayOverview());
  } catch (error) {
    next(error);
  }
});

const tools = express.Router();
tools.use(requireHermesToolToken);

tools.get("/overview/today", async (_req, res, next) => {
  try {
    res.json(await todayOverview());
  } catch (error) {
    next(error);
  }
});

tools.get("/goals", async (req, res, next) => {
  try {
    res.json(await listGoals(typeof req.query.status === "string" ? req.query.status : undefined));
  } catch (error) {
    next(error);
  }
});

tools.post("/goals", async (req, res, next) => {
  try {
    const body = z.object({ title: z.string().min(1), description: z.string().optional(), targetDate: z.string().optional(), progress: z.number().min(0).max(100).optional() }).parse(req.body);
    res.status(201).json(await createGoal(body));
  } catch (error) {
    next(error);
  }
});

tools.patch("/goals/:id", async (req, res, next) => {
  try {
    const body = z.object({ title: z.string().optional(), description: z.string().optional(), status: z.string().optional(), targetDate: z.string().optional(), progress: z.number().min(0).max(100).optional() }).parse(req.body);
    res.json(await updateGoal({ id: req.params.id, ...body }));
  } catch (error) {
    next(error);
  }
});

tools.get("/reminders", async (_req, res, next) => {
  try {
    res.json(await listReminders());
  } catch (error) {
    next(error);
  }
});

tools.get("/reminders/due", async (_req, res, next) => {
  try {
    res.json(await dueReminders());
  } catch (error) {
    next(error);
  }
});

tools.post("/reminders", async (req, res, next) => {
  try {
    const body = z.object({ message: z.string().min(1), remindAt: z.string().min(1), recurrenceRule: z.string().optional() }).parse(req.body);
    res.status(201).json(await createReminder(body));
  } catch (error) {
    next(error);
  }
});

tools.delete("/reminders/:id", async (req, res, next) => {
  try {
    res.json(await cancelReminder(req.params.id));
  } catch (error) {
    next(error);
  }
});

tools.post("/reminders/:id/sent", async (req, res, next) => {
  try {
    await markReminderSent(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

tools.get("/memories", async (req, res, next) => {
  try {
    res.json(await searchMemories(typeof req.query.q === "string" ? req.query.q : undefined));
  } catch (error) {
    next(error);
  }
});

tools.post("/memories", async (req, res, next) => {
  try {
    const body = z.object({ kind: z.string().optional(), content: z.string().min(1), importance: z.number().min(1).max(5).optional() }).parse(req.body);
    res.status(201).json(await saveMemory(body));
  } catch (error) {
    next(error);
  }
});

tools.post("/dashboard/snapshot", async (req, res, next) => {
  try {
    const body = z.object({
      date: z.string().optional(),
      calendarEvents: z.array(z.unknown()).optional(),
      tasks: z.array(z.unknown()).optional(),
      notes: z.string().nullable().optional()
    }).parse(req.body);
    res.status(201).json(await upsertDashboardSnapshot(body));
  } catch (error) {
    next(error);
  }
});

router.use("/api/tools", tools);

router.get("/api/hermes/context", requireHermesToolToken, (_req, res) => {
  res.json({
    baseUrl: config.APP_BASE_URL,
    timezone: config.DEFAULT_TIMEZONE,
    instructions: "Use ISO 8601 timestamps with timezone offsets. Ask before destructive or ambiguous calendar/task actions."
  });
});

export { router };

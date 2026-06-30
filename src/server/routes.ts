import express from "express";
import { z } from "zod";
import { config } from "../config.js";
import { createGoal, listGoals, updateGoal } from "../domain/goals.js";
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

router.patch("/api/dashboard/goals/:id", requireDashboardToken, async (req, res, next) => {
  try {
    const body = z.object({ status: z.string().optional(), progress: z.number().min(0).max(100).optional() }).parse(req.body);
    res.json(await updateGoal({ id: req.params.id, ...body }));
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

tools.post("/dashboard/snapshot", async (req, res, next) => {
  try {
    const body = z.object({
      date: z.string().optional(),
      calendarEvents: z.array(z.unknown()).optional(),
      calendars: z.array(z.unknown()).optional(),
      tasks: z.array(z.unknown()).optional(),
      taskLists: z.array(z.unknown()).optional(),
      reminders: z.array(z.unknown()).optional(),
      memories: z.array(z.unknown()).optional(),
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

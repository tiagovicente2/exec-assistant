import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { safeTokenEquals } from "../security/tokens.js";

function bearerToken(req: Request) {
  const header = req.header("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7) : undefined;
}

export function requireHermesToolToken(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req) ?? req.header("x-hermes-token");
  if (!safeTokenEquals(token, config.HERMES_TOOL_TOKEN)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

export function requireDashboardToken(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req) ?? req.header("x-dashboard-token");
  if (!safeTokenEquals(token, config.DASHBOARD_TOKEN)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

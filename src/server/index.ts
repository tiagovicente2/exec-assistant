import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import pinoHttp from "pino-http";
import { config } from "../config.js";
import { ensureOwnerProfile } from "../domain/profile.js";
import { logger } from "../logger.js";
import { router } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));
app.use(router);
app.use(express.static(publicDir));
app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  logger.error({ error }, message);
  res.status(500).json({ error: message });
});

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, baseUrl: config.APP_BASE_URL }, "exec assistant companion started");
});

ensureOwnerProfile().catch((error) => {
  logger.error({ error }, "failed to ensure owner profile");
});

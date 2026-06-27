import { Router } from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Request, Response } from "express";
import { runStore } from "./run-store.js";
import type { StartRunRequest } from "../types.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "angelina-tester" });
});

apiRouter.get("/runs", (_req, res) => {
  res.json(runStore.list());
});

apiRouter.get("/runs/:id", (req, res) => {
  const run = runStore.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(run);
});

apiRouter.post("/runs", async (req, res) => {
  try {
    const body = req.body as StartRunRequest;
    if (!body.url?.trim()) {
      res.status(400).json({ error: "url is required" });
      return;
    }
    const run = await runStore.start(body);
    res.status(201).json(run);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

apiRouter.get("/runs/:id/events", (req, res) => {
  const run = runStore.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ type: "snapshot", run });

  const unsubscribe = runStore.subscribe(req.params.id, (event) => {
    send(event);
    if (event.type === "complete" || event.type === "error") {
      setTimeout(() => res.end(), 500);
    }
  });

  req.on("close", unsubscribe);
});

apiRouter.get("/runs/:id/screenshots/:file", (req, res) => {
  const outputDir = runStore.getOutputDir(req.params.id);
  if (!outputDir) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  const filePath = join(outputDir, "screenshots", req.params.file);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "Screenshot not found" });
    return;
  }
  res.sendFile(filePath);
});

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

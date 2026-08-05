import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_TIMEOUT_MS = 2 * 60 * 1000;
const taskLogs = [];
const MAX_TASK_LOGS = 500;

export function taskRouter(dataDir) {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    const startedAt = Date.now();
    try {
      const result = await runPdfWorker(dataDir, req.body);
      addTaskLog(req.body, "done", Date.now() - startedAt);
      res.json({ result });
    } catch (error) {
      addTaskLog(req.body, "failed", Date.now() - startedAt, error);
      next(error);
    } finally {
      await cleanupInputFiles(dataDir, req.body?.files);
    }
  });

  router.get("/logs", (req, res) => {
    res.json({ logs: taskLogs });
  });

  return router;
}

function addTaskLog(payload = {}, status, durationMs, error) {
  taskLogs.unshift({
    type: payload.type || "unknown",
    status,
    durationMs,
    fileCount: Array.isArray(payload.files) ? payload.files.length : 0,
    error: error ? String(error.message || error).slice(0, 160) : "",
    ts: Date.now()
  });
  if (taskLogs.length > MAX_TASK_LOGS) taskLogs.length = MAX_TASK_LOGS;
}

async function cleanupInputFiles(dataDir, files = []) {
  const inputDir = path.resolve(dataDir, "inputs");
  await Promise.all(
    files.map(async (file) => {
      if (!file || !file.path) return;
      const target = path.resolve(file.path);
      if (!target.startsWith(inputDir + path.sep)) return;
      await fs.rm(target, { force: true }).catch(() => {});
    })
  );
}

function runPdfWorker(dataDir, payload) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, "../workers/pdf-worker.js"), {
      workerData: { dataDir, payload },
      resourceLimits: {
        maxOldGenerationSizeMb: 256,
        maxYoungGenerationSizeMb: 64
      }
    });

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      reject(new Error("Worker task timeout"));
    }, WORKER_TIMEOUT_MS);

    function finish(callback) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    }

    worker.once("message", (message) => {
      finish(() => {
        if (message && message.ok) resolve(message.result);
        else reject(new Error((message && message.message) || "Worker task failed"));
      });
    });

    worker.once("error", (error) => {
      finish(() => reject(error));
    });

    worker.once("exit", (code) => {
      if (!settled && code !== 0) {
        clearTimeout(timer);
        settled = true;
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

import express from "express";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_TIMEOUT_MS = 2 * 60 * 1000;

export function taskRouter(dataDir) {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    try {
      const result = await runPdfWorker(dataDir, req.body);
      res.json({ result });
    } catch (error) {
      next(error);
    }
  });

  return router;
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

import express from "express";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      workerData: { dataDir, payload }
    });

    let settled = false;
    worker.once("message", (message) => {
      settled = true;
      if (message && message.ok) resolve(message.result);
      else reject(new Error((message && message.message) || "Worker task failed"));
    });

    worker.once("error", (error) => {
      settled = true;
      reject(error);
    });

    worker.once("exit", (code) => {
      if (!settled && code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

import { parentPort, workerData } from "node:worker_threads";
import { processPdfTask } from "../services/pdf-service.js";

try {
  const result = await processPdfTask(workerData.dataDir, workerData.payload);
  parentPort.postMessage({ ok: true, result });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    message: error.message || "PDF worker failed"
  });
}

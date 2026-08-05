import express from "express";
import cors from "cors";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uploadRouter } from "./routes/uploads.js";
import { taskRouter } from "./routes/tasks.js";
import { logRouter } from "./routes/logs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
const dataDir = process.env.PDF_TOOL_DATA_DIR || path.join(os.tmpdir(), "wechat-pdf-toolbox-data");

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/files", express.static(path.join(dataDir, "outputs")));
app.use("/api/uploads", uploadRouter(dataDir));
app.use("/api/tasks", taskRouter(dataDir));
app.use("/api/logs", logRouter());

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: error.message || "PDF service failed"
  });
});

app.listen(port, () => {
  console.log(`PDF toolbox server listening on http://127.0.0.1:${port}`);
  console.log(`PDF toolbox data directory: ${dataDir}`);
});

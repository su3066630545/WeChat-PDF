import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import multer from "multer";
import express from "express";

export function uploadRouter(dataDir) {
  const router = express.Router();
  const chunkDir = path.join(dataDir, "chunks");
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      fsSync.mkdirSync(chunkDir, { recursive: true });
      callback(null, chunkDir);
    }
  });
  const upload = multer({ storage });

  router.post("/chunk", upload.single("chunk"), async (req, res) => {
    const { uploadId, index } = req.body;
    if (!uploadId || index === undefined || !req.file) {
      res.status(400).json({ message: "Invalid chunk upload" });
      return;
    }

    const targetDir = path.join(chunkDir, uploadId);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.rename(req.file.path, path.join(targetDir, `${index}.part`));
    res.json({ ok: true });
  });

  router.post("/complete", async (req, res) => {
    const { uploadId, name, totalChunks } = req.body;
    if (!uploadId || !name || !totalChunks) {
      res.status(400).json({ message: "Invalid upload completion" });
      return;
    }

    const safeName = path.basename(name);
    const inputDir = path.join(dataDir, "inputs");
    const targetPath = path.join(inputDir, `${uploadId}-${safeName}`);
    await fs.mkdir(inputDir, { recursive: true });

    const handle = await fs.open(targetPath, "w");
    try {
      for (let index = 0; index < Number(totalChunks); index += 1) {
        const part = await fs.readFile(path.join(chunkDir, uploadId, `${index}.part`));
        await handle.write(part);
      }
    } finally {
      await handle.close();
    }

    await fs.rm(path.join(chunkDir, uploadId), { recursive: true, force: true });
    res.json({
      file: {
        name: safeName,
        path: targetPath
      }
    });
  });

  return router;
}

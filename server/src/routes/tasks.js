import express from "express";
import { processPdfTask } from "../services/pdf-service.js";

export function taskRouter(dataDir) {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    try {
      const result = await processPdfTask(dataDir, req.body);
      res.json({ result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

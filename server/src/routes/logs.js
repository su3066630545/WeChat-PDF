import express from "express";

const logs = [];
const MAX_LOGS = 500;

export function logRouter() {
  const router = express.Router();

  router.post("/", (req, res) => {
    const entry = {
      event: String(req.body?.event || "unknown").slice(0, 80),
      route: String(req.body?.route || "").slice(0, 160),
      payload: req.body?.payload || {},
      ts: Number(req.body?.ts) || Date.now()
    };

    logs.unshift(entry);
    if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
    res.json({ ok: true });
  });

  router.get("/", (req, res) => {
    res.json({ logs });
  });

  return router;
}

const MAX_LOCAL_LOGS = 20;
const cache = require("./cache");
const { sendLog } = require("./api");

function track(event, payload = {}) {
  const app = getApp();
  const log = {
    event,
    payload: sanitize(payload),
    route: getCurrentRoute(),
    ts: Date.now()
  };

  persistLocal(log);

  if (!app.globalData || !app.globalData.enableLogUpload) return;

  sendLog(log).catch(() => {});
}

function trackError(error, context = {}) {
  track("error", {
    ...context,
    message: getErrorMessage(error),
    stack: error && error.stack ? String(error.stack).slice(0, 600) : ""
  });
}

function sanitize(payload) {
  const next = {};
  Object.keys(payload || {}).forEach((key) => {
    if (/path|name|url/i.test(key)) return;
    const value = payload[key];
    next[key] = typeof value === "string" ? value.slice(0, 160) : value;
  });
  return next;
}

function persistLocal(log) {
  cache.pushLog(log, MAX_LOCAL_LOGS);
}

function getCurrentRoute() {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  return page ? page.route : "";
}

function getErrorMessage(error) {
  return (error && error.message) || (error && error.errMsg) || String(error || "unknown error");
}

module.exports = {
  track,
  trackError
};

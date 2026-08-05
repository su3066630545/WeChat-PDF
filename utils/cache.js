const KEYS = {
  latestResult: "latestPdfResult",
  taskRunning: "pdfTaskRunning",
  lastToolRoute: "lastPdfToolRoute",
  lastToolType: "lastPdfToolType",
  logs: "pdfToolLogs"
};

function get(key, fallback = null) {
  try {
    const value = wx.getStorageSync(key);
    return value === "" || value === undefined ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function set(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {}
}

function getLatestResult() {
  return get(KEYS.latestResult);
}

function setLatestResult(result) {
  set(KEYS.latestResult, result);
}

function setTaskRunning(running) {
  set(KEYS.taskRunning, Boolean(running));
}

function rememberTool(route, type) {
  set(KEYS.lastToolRoute, route);
  set(KEYS.lastToolType, type);
}

function getLastToolRoute() {
  return get(KEYS.lastToolRoute);
}

function pushLog(log, limit = 20) {
  const logs = get(KEYS.logs, []);
  logs.unshift(log);
  set(KEYS.logs, logs.slice(0, limit));
}

module.exports = {
  KEYS,
  get,
  set,
  getLatestResult,
  setLatestResult,
  setTaskRunning,
  rememberTool,
  getLastToolRoute,
  pushLog
};

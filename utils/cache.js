const KEYS = {
  latestResult: "latestPdfResult",
  recentResults: "recentPdfResults",
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
  pushRecentResult(result);
}

function getRecentResults(limit = 3) {
  const results = get(KEYS.recentResults, []);
  if (results.length) return results.slice(0, limit);
  const latest = getLatestResult();
  return latest ? [{ ...latest, cachedAt: latest.cachedAt || Date.now() }] : [];
}

function pushRecentResult(result, limit = 5) {
  if (!result) return;
  const nextResult = {
    ...result,
    cachedAt: result.cachedAt || Date.now()
  };
  const key = getResultKey(nextResult);
  const results = get(KEYS.recentResults, []).filter((item) => getResultKey(item) !== key);
  results.unshift(nextResult);
  set(KEYS.recentResults, results.slice(0, limit));
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

function getResultKey(result) {
  return result.url || result.filePath || `${result.type || ""}:${result.name || ""}:${result.cachedAt || ""}`;
}

module.exports = {
  KEYS,
  get,
  set,
  getLatestResult,
  setLatestResult,
  getRecentResults,
  pushRecentResult,
  setTaskRunning,
  rememberTool,
  getLastToolRoute,
  pushLog
};

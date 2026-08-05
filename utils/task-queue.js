const tasks = [];
const listeners = [];
const MAX_TASKS = 20;

function emit() {
  listeners.forEach((listener) => listener(tasks.slice()));
}

function subscribe(listener) {
  listeners.push(listener);
  listener(tasks.slice());
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

function addTask(task) {
  const fingerprint = task.fingerprint || createFingerprint(task);
  const duplicated = tasks.find((item) => item.fingerprint === fingerprint && ["pending", "running"].includes(item.status));
  if (duplicated) return duplicated;

  const nextTask = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fingerprint,
    status: "pending",
    progress: 0,
    createdAt: Date.now(),
    ...task
  };
  tasks.unshift(nextTask);
  if (tasks.length > MAX_TASKS) tasks.length = MAX_TASKS;
  emit();
  return nextTask;
}

function updateTask(id, patch) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  Object.assign(task, patch);
  emit();
}

function getTasks() {
  return tasks.slice();
}

function createFingerprint(task) {
  const files = (task.files || []).map((file) => `${file.size || 0}:${file.name || ""}`).join("|");
  const options = stableStringify(task.options || {});
  return `${task.type || ""}:${files}:${options}`;
}

function stableStringify(value) {
  if (!value || typeof value !== "object") return String(value);
  return Object.keys(value)
    .sort()
    .map((key) => `${key}:${stableStringify(value[key])}`)
    .join(",");
}

module.exports = {
  addTask,
  updateTask,
  subscribe,
  getTasks,
  createFingerprint
};

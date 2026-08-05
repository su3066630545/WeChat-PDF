const tasks = [];
const listeners = [];

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
  const nextTask = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    status: "pending",
    progress: 0,
    createdAt: Date.now(),
    ...task
  };
  tasks.unshift(nextTask);
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

module.exports = {
  addTask,
  updateTask,
  subscribe,
  getTasks
};

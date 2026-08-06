const { TOOL_CONFIG } = require("../../../utils/constants");
const {
  chooseFilesByExtension,
  chooseImages,
  openDocument,
  saveImageToAlbum,
  copyText,
  isUserCancel
} = require("../../../utils/file");
const { validateFiles, getExtension } = require("../../../utils/validator");
const { runPdfTask } = require("../../../utils/pdf-core");
const queue = require("../../../utils/task-queue");
const monitor = require("../../../utils/monitor");
const cache = require("../../../utils/cache");

const steps = [
  { key: "choose", name: "选择文件" },
  { key: "parse", name: "解析校验" },
  { key: "process", name: "处理文件" },
  { key: "preview", name: "预览结果" },
  { key: "save", name: "保存导出" }
];

function createToolPage(type, defaults = {}) {
  const config = TOOL_CONFIG[type];

  Page({
    data: {
      type,
      title: config.title,
      subtitle: config.subtitle,
      optionFields: buildOptionFields(config.optionFields || [], defaults),
      files: [],
      options: { ...defaults },
      steps,
      activeStep: "choose",
      loading: false,
      showSkeleton: false,
      progress: 0,
      result: null,
      error: "",
      lastTaskInput: null
    },

    onLoad() {
      this.rememberToolRoute();
      this.restoreLatestResult();
    },

    onShow() {
      this.rememberToolRoute();
      this.restoreLatestResult();
    },

    onUnload() {
      this.clearSkeletonTimer();
    },

    rememberToolRoute() {
      cache.rememberTool(`/${this.route}`, type);
    },

    restoreLatestResult() {
      const latest = cache.getLatestResult();
      if (!latest || latest.type !== type || this.data.loading || this.data.result) return;

      this.setData({
        result: latest,
        progress: 100,
        activeStep: "preview",
        error: ""
      });
    },

    async chooseFiles() {
      try {
        this.setData({ activeStep: "choose", error: "", result: null, progress: 0 });
        const files = await chooseByConfig(config);
        if (!files.length) {
          this.setData({ activeStep: "choose", error: "", loading: false, showSkeleton: false });
          return;
        }
        this.setData({ activeStep: "parse" });
        await validateFiles(files, config);
        this.setData({ files, activeStep: "process" });
        monitor.track("files_selected", { type, count: files.length, totalSize: sumFileSize(files) });
      } catch (error) {
        if (isUserCancel(error)) {
          this.setData({ activeStep: "choose", error: "", loading: false, showSkeleton: false });
          return;
        }
        monitor.trackError(error, { type, action: "chooseFiles" });
        this.showError(error);
      }
    },

    updateOption(event) {
      const key = event.currentTarget.dataset.key;
      const index = event.currentTarget.dataset.index;
      this.setData({
        [`options.${key}`]: event.detail.value,
        [`optionFields[${index}].value`]: event.detail.value
      });
    },

    async runTask() {
      const { files, options } = this.data;
      let task;

      try {
        this.rememberToolRoute();
        this.setData({ activeStep: "parse" });
        await validateFiles(files, config);
        const fingerprint = queue.createFingerprint({ type, files, options });
        const currentTasks = queue.getTasks();
        const runningDuplicate = currentTasks.find((item) => item.fingerprint === fingerprint && ["pending", "running"].includes(item.status));
        if (runningDuplicate) {
          monitor.track("task_deduped", { type, status: runningDuplicate.status });
          wx.showToast({ title: "相同任务处理中", icon: "none" });
          return;
        }

        const duplicated = currentTasks.find((item) => item.fingerprint === fingerprint && item.status === "done" && item.result);
        if (duplicated) {
          this.setData({
            result: duplicated.result,
            progress: 100,
            activeStep: "preview",
            error: ""
          });
          cache.setLatestResult(duplicated.result);
          monitor.track("task_deduped", { type, status: "done" });
          return;
        }

        this.setData({
          loading: true,
          showSkeleton: false,
          activeStep: "process",
          progress: 0,
          error: "",
          result: null,
          lastTaskInput: { files, options }
        });
        this.startSkeletonTimer();
        cache.setTaskRunning(true);
        task = queue.addTask({ type, title: config.title, files, options, fingerprint });
        monitor.track("task_started", { type, fileCount: files.length, totalSize: sumFileSize(files) });

        const result = await runPdfTask(type, files, options, (progress) => {
          this.setData({ progress });
          queue.updateTask(task.id, { progress, status: "running" });
        });

        const nextResult = {
          ...result,
          type,
          name: getResultName(result),
          route: `/${this.route}`
        };

        this.setData({
          result: nextResult,
          loading: false,
          showSkeleton: false,
          progress: 100,
          activeStep: "preview"
        });
        this.clearSkeletonTimer();
        queue.updateTask(task.id, { status: "done", progress: 100, result: nextResult });
        cache.setLatestResult(nextResult);
        cache.setTaskRunning(false);
        this.releaseInputFiles();
        monitor.track("task_done", { type, progress: 100 });
        wx.showToast({ title: "处理完成", icon: "success" });
      } catch (error) {
        this.clearSkeletonTimer();
        this.setData({ loading: false, showSkeleton: false });
        cache.setTaskRunning(false);
        if (task) queue.updateTask(task.id, { status: "failed", error: getErrorMessage(error) });
        monitor.trackError(error, { type, action: "runTask" });
        this.showError(error);
      }
    },

    startSkeletonTimer() {
      this.clearSkeletonTimer();
      this.skeletonTimer = setTimeout(() => {
        if (this.data.loading && !this.data.result) {
          this.setData({ showSkeleton: true });
        }
      }, 650);
    },

    clearSkeletonTimer() {
      if (!this.skeletonTimer) return;
      clearTimeout(this.skeletonTimer);
      this.skeletonTimer = null;
    },

    releaseInputFiles() {
      this.setData({ files: [] });
    },

    retryTask() {
      if (!this.data.files.length) {
        this.showError("请先选择文件");
        return;
      }
      this.runTask();
    },

    async openResult() {
      const { result } = this.data;
      if (!result || !result.filePath) {
        this.showError("暂无结果文件");
        return;
      }

      try {
        this.setData({ activeStep: "preview" });
        await openDocument(result.filePath, result.fileType || getExtension(result.fileName || result.filePath));
      } catch (error) {
        this.showError(error);
      }
    },

    async saveResult() {
      const { result } = this.data;
      if (!result || !result.filePath) {
        this.showError("暂无结果文件");
        return;
      }

      try {
        this.setData({ activeStep: "save" });
        if (result.kind === "image") {
          const images = result.files && result.files.length ? result.files : [{ filePath: result.filePath }];
          for (const image of images) {
            await saveImageToAlbum(image.filePath);
          }
          wx.showToast({ title: "已保存到相册", icon: "success" });
          return;
        }

        await openDocument(result.filePath, result.fileType || getExtension(result.fileName || result.filePath));
        wx.showToast({ title: "请用右上角菜单保存", icon: "none" });
      } catch (error) {
        this.showError(error);
      }
    },

    async copyResultUrl() {
      const { result } = this.data;
      if (!result || !result.url) {
        this.showError("暂无下载链接");
        return;
      }

      try {
        await copyText(`${getApp().globalData.apiBaseUrl}${result.url}`);
      } catch (error) {
        this.showError(error);
      }
    },

    exportResult() {
      this.openResult();
    },

    showError(error) {
      const message = getErrorMessage(error);
      this.setData({ error: message });
      wx.showModal({
        title: "处理失败",
        content: message,
        confirmText: "重试",
        cancelText: "关闭",
        success: (res) => {
          if (res.confirm) this.retryTask();
        }
      });
    }
  });
}

function chooseByConfig(config) {
  if (config.accept.includes("image")) {
    return chooseImages(config.maxFiles);
  }
  return chooseFilesByExtension(config.accept, config.maxFiles);
}

function buildOptionFields(fields, defaults) {
  return fields.map((field) => ({
    ...field,
    value: defaults[field.key] || ""
  }));
}

function getErrorMessage(error) {
  return (error && error.message) || (error && error.errMsg) || "操作失败";
}

function getResultName(result) {
  if (!result) return "";
  if (result.name) return result.name;
  if (result.fileName) return result.fileName;
  if (result.url) return result.url.split("/").pop();
  if (result.filePath) return result.filePath.split("/").pop();
  return "";
}

function sumFileSize(files) {
  return files.reduce((total, file) => total + (file.size || 0), 0);
}

module.exports = {
  createToolPage
};

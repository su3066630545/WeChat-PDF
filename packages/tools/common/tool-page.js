const { TOOL_CONFIG } = require("../../../utils/constants");
const {
  choosePdfFiles,
  chooseImages,
  openDocument,
  saveImageToAlbum,
  copyText
} = require("../../../utils/file");
const { validateFiles } = require("../../../utils/validator");
const { runPdfTask } = require("../../../utils/pdf-core");
const queue = require("../../../utils/task-queue");

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
      files: [],
      options: { ...defaults },
      steps,
      activeStep: "choose",
      loading: false,
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

    rememberToolRoute() {
      wx.setStorageSync("lastPdfToolRoute", `/${this.route}`);
      wx.setStorageSync("lastPdfToolType", type);
    },

    restoreLatestResult() {
      const latest = wx.getStorageSync("latestPdfResult");
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
        const files = config.accept.includes("image")
          ? await chooseImages(config.maxFiles)
          : await choosePdfFiles(config.maxFiles);

        this.setData({ activeStep: "parse" });
        await validateFiles(files, config);
        this.setData({ files, activeStep: "process" });
      } catch (error) {
        this.showError(error);
      }
    },

    updateOption(event) {
      const key = event.currentTarget.dataset.key;
      this.setData({
        [`options.${key}`]: event.detail.value
      });
    },

    async runTask() {
      const { files, options } = this.data;
      let task;

      try {
        this.rememberToolRoute();
        this.setData({ activeStep: "parse" });
        await validateFiles(files, config);
        this.setData({
          loading: true,
          activeStep: "process",
          progress: 0,
          error: "",
          result: null,
          lastTaskInput: { files, options }
        });
        wx.setStorageSync("pdfTaskRunning", true);
        task = queue.addTask({ type, title: config.title, files });

        const result = await runPdfTask(type, files, options, (progress) => {
          this.setData({ progress });
          queue.updateTask(task.id, { progress, status: "running" });
        });

        const nextResult = {
          ...result,
          type,
          name: getResultName(result)
        };

        this.setData({
          result: nextResult,
          loading: false,
          progress: 100,
          activeStep: "preview"
        });
        queue.updateTask(task.id, { status: "done", progress: 100, result: nextResult });
        wx.setStorageSync("latestPdfResult", nextResult);
        wx.setStorageSync("pdfTaskRunning", false);
        wx.showToast({ title: "处理完成", icon: "success" });
      } catch (error) {
        this.setData({ loading: false });
        wx.setStorageSync("pdfTaskRunning", false);
        if (task) queue.updateTask(task.id, { status: "failed", error: getErrorMessage(error) });
        this.showError(error);
      }
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
        await openDocument(result.filePath);
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

        await openDocument(result.filePath);
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

function getErrorMessage(error) {
  return (error && error.message) || (error && error.errMsg) || "操作失败";
}

function getResultName(result) {
  if (!result) return "";
  if (result.name) return result.name;
  if (result.url) return result.url.split("/").pop();
  if (result.filePath) return result.filePath.split("/").pop();
  return "";
}

module.exports = {
  createToolPage
};

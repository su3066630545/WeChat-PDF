const { TOOL_CONFIG } = require("../../../utils/constants");
const {
  choosePdfFiles,
  chooseImages,
  openDocument,
  saveFile,
  saveImageToAlbum,
  copyText
} = require("../../../utils/file");
const { validateFiles } = require("../../../utils/validator");
const { runPdfTask } = require("../../../utils/pdf-core");
const queue = require("../../../utils/task-queue");

function createToolPage(type, defaults = {}) {
  const config = TOOL_CONFIG[type];

  Page({
    data: {
      type,
      title: config.title,
      files: [],
      options: { ...defaults },
      loading: false,
      progress: 0,
      result: null,
      savedPath: "",
      error: ""
    },

    async chooseFiles() {
      try {
        const files = config.accept.includes("image")
          ? await chooseImages(config.maxFiles)
          : await choosePdfFiles(config.maxFiles);

        await validateFiles(files, config);
        this.setData({ files, error: "", result: null, savedPath: "", progress: 0 });
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
        await validateFiles(files, config);
        this.setData({ loading: true, progress: 0, error: "", result: null, savedPath: "" });
        task = queue.addTask({ type, title: config.title, files });

        const result = await runPdfTask(type, files, options, (progress) => {
          this.setData({ progress });
          queue.updateTask(task.id, { progress, status: "running" });
        });

        const nextResult = {
          ...result,
          name: getResultName(result)
        };

        this.setData({ result: nextResult, savedPath: "", loading: false, progress: 100 });
        queue.updateTask(task.id, { status: "done", progress: 100, result: nextResult });
        wx.showToast({ title: "处理完成", icon: "success" });
      } catch (error) {
        this.setData({ loading: false });
        if (task) queue.updateTask(task.id, { status: "failed", error: getErrorMessage(error) });
        this.showError(error);
      }
    },

    async openResult() {
      const { result } = this.data;
      if (!result || !result.filePath) {
        wx.showToast({ title: "暂无结果文件", icon: "none" });
        return;
      }

      try {
        await openDocument(result.filePath);
      } catch (error) {
        this.showError(error);
      }
    },

    async saveResult() {
      const { result } = this.data;
      if (!result || !result.filePath) {
        wx.showToast({ title: "暂无结果文件", icon: "none" });
        return;
      }

      try {
        if (result.kind === "image") {
          const images = result.files && result.files.length ? result.files : [{ filePath: result.filePath }];
          for (const image of images) {
            await saveImageToAlbum(image.filePath);
          }
          wx.showToast({ title: "已保存到相册", icon: "success" });
          return;
        }

        if (this.data.savedPath) {
          wx.showToast({ title: "已保存到本地", icon: "success" });
          return;
        }

        const saved = await saveFile(result.filePath);
        this.setData({ savedPath: saved.savedFilePath, "result.filePath": saved.savedFilePath });
        wx.showToast({ title: "已保存到本地", icon: "success" });
      } catch (error) {
        this.showError(error);
      }
    },

    async copyResultUrl() {
      const { result } = this.data;
      if (!result || !result.url) {
        wx.showToast({ title: "暂无下载链接", icon: "none" });
        return;
      }

      try {
        const baseUrl = getApp().globalData.apiBaseUrl;
        await copyText(`${baseUrl}${result.url}`);
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
      wx.showToast({ title: message, icon: "none" });
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

const { TOOL_CONFIG } = require("../../../utils/constants");
const { choosePdfFiles, chooseImages, openDocument, saveImageToAlbum } = require("../../../utils/file");
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
      error: ""
    },

    async chooseFiles() {
      try {
        const files = config.accept.includes("image")
          ? await chooseImages(config.maxFiles)
          : await choosePdfFiles(config.maxFiles);

        await validateFiles(files, config);
        this.setData({ files, error: "", result: null });
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
        this.setData({ loading: true, progress: 0, error: "", result: null });
        task = queue.addTask({ type, title: config.title, files });

        const result = await runPdfTask(type, files, options, (progress) => {
          this.setData({ progress });
          queue.updateTask(task.id, { progress, status: "running" });
        });

        this.setData({ result, loading: false, progress: 100 });
        queue.updateTask(task.id, { status: "done", progress: 100, result });
      } catch (error) {
        this.setData({ loading: false });
        if (task) queue.updateTask(task.id, { status: "failed", error: error.message });
        this.showError(error);
      }
    },

    async exportResult() {
      const { result } = this.data;
      if (!result || !result.filePath) {
        wx.showToast({ title: "暂无可导出文件", icon: "none" });
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

        await openDocument(result.filePath);
      } catch (error) {
        this.showError(error);
      }
    },

    showError(error) {
      const message = error && error.message ? error.message : "操作失败";
      this.setData({ error: message });
      wx.showToast({ title: message, icon: "none" });
    }
  });
}

module.exports = {
  createToolPage
};

const { openDocument, saveFile, saveImageToAlbum, copyText } = require("../../utils/file");

Page({
  data: {
    result: null,
    savedPath: "",
    error: ""
  },

  onLoad() {
    const result = wx.getStorageSync("latestPdfResult");
    this.setData({
      result,
      savedPath: result && result.savedPath ? result.savedPath : ""
    });
  },

  async openResult() {
    const { result } = this.data;
    if (!result || !result.filePath) {
      this.showError("暂无结果文件");
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
      this.showError("暂无结果文件");
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

      const saved = await saveFile(result.filePath);
      const nextResult = {
        ...result,
        filePath: saved.savedFilePath,
        savedPath: saved.savedFilePath
      };
      wx.setStorageSync("latestPdfResult", nextResult);
      this.setData({ result: nextResult, savedPath: saved.savedFilePath });
      wx.showToast({ title: "已保存到本地", icon: "success" });
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

  goHome() {
    wx.switchTab
      ? wx.navigateBack({ delta: 99 })
      : wx.navigateTo({ url: "/pages/index/index" });
  },

  showError(error) {
    const message = typeof error === "string" ? error : (error && (error.message || error.errMsg)) || "操作失败";
    this.setData({ error: message });
    wx.showToast({ title: message, icon: "none" });
  }
});

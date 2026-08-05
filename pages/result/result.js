const { openDocument, saveImageToAlbum, copyText } = require("../../utils/file");

Page({
  data: {
    result: null,
    error: ""
  },

  onLoad() {
    this.setData({
      result: wx.getStorageSync("latestPdfResult")
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

  showError(error) {
    const message = typeof error === "string" ? error : (error && (error.message || error.errMsg)) || "操作失败";
    this.setData({ error: message });
    wx.showToast({ title: message, icon: "none" });
  }
});

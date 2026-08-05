App({
  globalData: {
    createdAt: new Date().toISOString(),
    apiBaseUrl: "http://127.0.0.1:3000"
  },

  onLaunch() {
    this.installErrorHandlers();
    console.log("PDF tools launched");
  },

  installErrorHandlers() {
    wx.onError((error) => {
      console.error("Global error", error);
      wx.showToast({
        title: "运行异常",
        icon: "none"
      });
    });

    wx.onUnhandledRejection((event) => {
      console.error("Unhandled rejection", event.reason);
      wx.showToast({
        title: "任务处理失败",
        icon: "none"
      });
    });
  }
});

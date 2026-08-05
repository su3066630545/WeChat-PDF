App({
  globalData: {
    createdAt: new Date().toISOString(),
    apiBaseUrl: "http://127.0.0.1:3000",
    enableLogUpload: true
  },

  onLaunch() {
    this.installErrorHandlers();
    console.log("PDF tools launched");
  },

  installErrorHandlers() {
    const monitor = require("./utils/monitor");

    wx.onError((error) => {
      console.error("Global error", error);
      monitor.trackError(error, { scope: "global" });
      wx.showToast({
        title: "运行异常",
        icon: "none"
      });
    });

    wx.onUnhandledRejection((event) => {
      console.error("Unhandled rejection", event.reason);
      monitor.trackError(event.reason, { scope: "unhandledRejection" });
      wx.showToast({
        title: "任务处理失败",
        icon: "none"
      });
    });
  }
});

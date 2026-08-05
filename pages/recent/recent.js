const cache = require("../../utils/cache");

const toolRouteMap = {
  compress: "/packages/tools/compress/index",
  merge: "/packages/tools/merge/index",
  split: "/packages/tools/split/index",
  "convert-image": "/packages/tools/convert-image/index",
  "image-to-pdf": "/packages/tools/image-to-pdf/index",
  watermark: "/packages/tools/watermark/index",
  rotate: "/packages/tools/rotate/index",
  "delete-pages": "/packages/tools/delete-pages/index"
};

Page({
  data: {
    results: []
  },

  onShow() {
    this.setData({
      results: cache.getRecentResults(10).map(formatResult)
    });
  },

  openResult(event) {
    const index = Number(event.currentTarget.dataset.index);
    const item = this.data.results[index];
    if (!item || !item.raw) return;

    cache.setLatestResult(item.raw);
    wx.navigateTo({
      url: item.route
    });
  }
});

function formatResult(result) {
  return {
    raw: result,
    route: result.route || toolRouteMap[result.type] || "/pages/result/result",
    badge: result.kind === "image" ? "IMG" : "PDF",
    badgeClass: result.kind === "image" ? "badge-image" : "badge-pdf",
    name: result.name || "PDF 处理结果",
    typeName: getTypeName(result.type),
    message: result.message || "处理完成",
    time: formatRelativeTime(result.cachedAt)
  };
}

function getTypeName(type) {
  const names = {
    compress: "PDF 压缩",
    merge: "PDF 合并",
    split: "PDF 拆分",
    "convert-image": "PDF 转图片",
    "image-to-pdf": "图片转 PDF",
    watermark: "PDF 加水印",
    rotate: "PDF 旋转",
    "delete-pages": "页面删除"
  };
  return names[type] || "PDF 工具";
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "刚刚";
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`;
}

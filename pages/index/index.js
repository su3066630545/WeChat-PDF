const cache = require("../../utils/cache");

const primaryTools = [
  { key: "compress", name: "PDF 压缩", desc: "减小文件体积", path: "/packages/tools/compress/index" },
  { key: "merge", name: "PDF 合并", desc: "多个文件合成一个", path: "/packages/tools/merge/index" },
  { key: "split", name: "PDF 拆分", desc: "按页码导出", path: "/packages/tools/split/index" },
  { key: "convert-image", name: "PDF 转图片", desc: "页面转为图片", path: "/packages/tools/convert-image/index" }
];

const extraTools = [
  { key: "image-to-pdf", name: "图片转 PDF", desc: "多图生成文档", path: "/packages/tools/image-to-pdf/index" },
  { key: "watermark", name: "添加水印", desc: "文本水印覆盖", path: "/packages/tools/watermark/index" },
  { key: "rotate", name: "PDF 旋转", desc: "页面方向调整", path: "/packages/tools/rotate/index" },
  { key: "delete-pages", name: "页面删除", desc: "移除指定页面", path: "/packages/tools/delete-pages/index" }
];

const toolRouteMap = primaryTools.concat(extraTools).reduce((map, tool) => {
  map[tool.key] = tool.path;
  return map;
}, {});

Page({
  data: {
    primaryTools,
    extraTools,
    hasLatestResult: false,
    recentResults: []
  },

  onShow() {
    const recentResults = cache.getRecentResults().map(formatRecentResult);
    this.setData({
      hasLatestResult: recentResults.length > 0,
      recentResults
    });
  },

  openTool(event) {
    wx.navigateTo({
      url: event.currentTarget.dataset.path
    });
  },

  openTasks() {
    wx.navigateTo({
      url: "/pages/tasks/tasks"
    });
  },

  openLatestResult() {
    const route = cache.getLastToolRoute();
    wx.navigateTo({
      url: route || "/pages/result/result"
    });
  },

  openRecentResult(event) {
    const index = Number(event.currentTarget.dataset.index);
    const item = this.data.recentResults[index];
    if (!item || !item.raw) return;

    cache.setLatestResult(item.raw);
    wx.navigateTo({
      url: getResultRoute(item.raw)
    });
  }
});

function getResultRoute(result) {
  return result.route || toolRouteMap[result.type] || "/pages/result/result";
}

function formatRecentResult(result) {
  return {
    raw: result,
    badge: result.kind === "image" ? "IMG" : "PDF",
    badgeClass: result.kind === "image" ? "recent-badge-image" : "recent-badge-pdf",
    name: result.name || "PDF 处理结果",
    meta: formatResultMeta(result)
  };
}

function formatResultMeta(result) {
  const time = formatRelativeTime(result.cachedAt);
  return result.message ? `${result.message} · ${time}` : time;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "刚刚";
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`;
}

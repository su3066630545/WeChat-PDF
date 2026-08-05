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

Page({
  data: {
    primaryTools,
    extraTools
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
  }
});

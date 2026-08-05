const tools = [
  { key: "compress", name: "PDF 压缩", path: "/packages/tools/compress/index" },
  { key: "merge", name: "PDF 合并", path: "/packages/tools/merge/index" },
  { key: "split", name: "PDF 拆分", path: "/packages/tools/split/index" },
  { key: "convert-image", name: "PDF 转图片", path: "/packages/tools/convert-image/index" },
  { key: "image-to-pdf", name: "图片转 PDF", path: "/packages/tools/image-to-pdf/index" },
  { key: "watermark", name: "PDF 加水印", path: "/packages/tools/watermark/index" }
];

Page({
  data: {
    tools
  },

  onLoad() {
    this.preloadPdfCore();
  },

  preloadPdfCore() {
    setTimeout(() => {
      try {
        require("../../utils/pdf-core");
      } catch (error) {
        console.warn("pdf core preload failed", error);
      }
    }, 0);
  },

  openTool(event) {
    wx.navigateTo({
      url: event.currentTarget.dataset.path
    });
  }
});

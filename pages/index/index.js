const cache = require("../../utils/cache");

const primaryTools = [
  { key: "image-to-pdf", name: "图片转 PDF", desc: "多图生成文档", path: "/packages/tools/image-to-pdf/index" },
  { key: "merge", name: "PDF 合并", desc: "多个文件合成一个", path: "/packages/tools/merge/index" },
  { key: "split", name: "PDF 拆分", desc: "按页码导出", path: "/packages/tools/split/index" },
  { key: "convert-image", name: "PDF 转图片", desc: "页面转为图片", path: "/packages/tools/convert-image/index" }
];

const extraTools = [
  { key: "compress", name: "PDF 压缩", desc: "减小文件体积", path: "/packages/tools/compress/index" },
  { key: "watermark", name: "添加水印", desc: "文本水印覆盖", path: "/packages/tools/watermark/index" },
  { key: "rotate", name: "PDF 旋转", desc: "页面方向调整", path: "/packages/tools/rotate/index" },
  { key: "delete-pages", name: "页面删除", desc: "移除指定页面", path: "/packages/tools/delete-pages/index" }
];

const fileToPdfTools = [
  { key: "word-to-pdf", name: "Word", desc: "DOC/DOCX 转 PDF" },
  { key: "excel-to-pdf", name: "Excel", desc: "表格转 PDF" },
  { key: "ppt-to-pdf", name: "PPT", desc: "演示文稿转 PDF" },
  { key: "txt-to-pdf", name: "TXT", desc: "纯文本转 PDF" },
  { key: "image-to-pdf", name: "图片", desc: "JPG/PNG 转 PDF", path: "/packages/tools/image-to-pdf/index" },
  { key: "cad-to-pdf", name: "CAD 图纸", desc: "DWG/DXF 转 PDF" },
  { key: "web-to-pdf", name: "网页", desc: "网页保存为 PDF" },
  { key: "photo-to-pdf", name: "照片导出", desc: "照片一键导出 PDF", path: "/packages/tools/image-to-pdf/index" }
];

const pdfExportTools = [
  { key: "pdf-to-word", name: "PDF 转 Word", desc: "导出 DOCX" },
  { key: "pdf-to-excel", name: "PDF 转 Excel", desc: "导出 XLSX" },
  { key: "pdf-to-ppt", name: "PDF 转 PPT", desc: "导出演示文稿" },
  { key: "pdf-to-text", name: "PDF 转纯文本", desc: "提取文字" },
  { key: "convert-image", name: "PDF 转图片", desc: "页面导出图片", path: "/packages/tools/convert-image/index" },
  { key: "pdf-to-html", name: "PDF 转 HTML", desc: "网页格式" },
  { key: "pdf-to-epub", name: "PDF 转 EPUB", desc: "电子书格式" },
  { key: "extract-images", name: "提取图片", desc: "保存 PDF 内图片" }
];

Page({
  data: {
    primaryTools,
    extraTools,
    fileToPdfTools,
    pdfExportTools,
    hasLatestResult: false
  },

  onShow() {
    this.setData({
      hasLatestResult: cache.getRecentResults().length > 0
    });
  },

  openTool(event) {
    wx.navigateTo({
      url: event.currentTarget.dataset.path
    });
  },

  openConversionTool(event) {
    const path = event.currentTarget.dataset.path;
    const name = event.currentTarget.dataset.name;
    if (path) {
      wx.navigateTo({ url: path });
      return;
    }

    wx.showModal({
      title: "功能规划中",
      content: `${name} 将接入服务端算力层处理，当前版本暂未开放。`,
      showCancel: false,
      confirmText: "知道了"
    });
  },

  openTasks() {
    wx.navigateTo({
      url: "/pages/tasks/tasks"
    });
  },

  openRecentResults() {
    wx.navigateTo({
      url: "/pages/recent/recent"
    });
  }
});

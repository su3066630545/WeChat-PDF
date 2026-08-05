const cache = require("../../utils/cache");

const primaryTools = [
  { key: "image-to-pdf", name: "图片转 PDF", desc: "多图生成文档", path: "/packages/tools/image-to-pdf/index" },
  { key: "merge", name: "PDF 合并", desc: "多个文件合成一个", path: "/packages/tools/merge/index" },
  { key: "split", name: "PDF 拆分", desc: "按页码导出", path: "/packages/tools/split/index" },
  { key: "convert-image", name: "PDF 转图片", desc: "页面转为图片", path: "/packages/tools/convert-image/index" }
];

const extraTools = [
  { key: "compress", name: "PDF 压缩", desc: "减小文件体积", path: "/packages/tools/compress/index" },
  { key: "watermark", name: "PDF 加水印", desc: "文字水印覆盖", path: "/packages/tools/watermark/index" },
  { key: "rotate", name: "PDF 旋转", desc: "页面方向调整", path: "/packages/tools/rotate/index" },
  { key: "delete-pages", name: "页面删除", desc: "移除指定页面", path: "/packages/tools/delete-pages/index" }
];

const fileToPdfTools = [
  { key: "word-to-pdf", name: "Word", desc: "DOC/DOCX 转 PDF", path: "/packages/tools/word-to-pdf/index" },
  { key: "excel-to-pdf", name: "Excel", desc: "XLS/XLSX 转 PDF", path: "/packages/tools/excel-to-pdf/index" },
  { key: "ppt-to-pdf", name: "PPT", desc: "PPT/PPTX 转 PDF", path: "/packages/tools/ppt-to-pdf/index" },
  { key: "txt-to-pdf", name: "TXT", desc: "文本转 PDF", path: "/packages/tools/txt-to-pdf/index" },
  { key: "image-to-pdf", name: "图片", desc: "JPG/PNG 转 PDF", path: "/packages/tools/image-to-pdf/index" },
  { key: "cad-to-pdf", name: "CAD 图纸", desc: "DWG/DXF 转 PDF", path: "/packages/tools/cad-to-pdf/index" },
  { key: "web-to-pdf", name: "网页", desc: "HTML 转 PDF", path: "/packages/tools/web-to-pdf/index" },
  { key: "photo-to-pdf", name: "照片一键导出", desc: "相册照片转 PDF", path: "/packages/tools/image-to-pdf/index" }
];

const pdfExportTools = [
  { key: "pdf-to-word", name: "PDF 转 Word", desc: "导出 DOCX", path: "/packages/tools/pdf-to-word/index" },
  { key: "pdf-to-excel", name: "PDF 转 Excel", desc: "导出 XLSX", path: "/packages/tools/pdf-to-excel/index" },
  { key: "pdf-to-ppt", name: "PDF 转 PPT", desc: "导出 PPTX", path: "/packages/tools/pdf-to-ppt/index" },
  { key: "pdf-to-text", name: "PDF 转纯文本", desc: "提取 TXT", path: "/packages/tools/pdf-to-text/index" },
  { key: "pdf-to-image", name: "PDF 转图片", desc: "导出 PNG", path: "/packages/tools/convert-image/index" },
  { key: "pdf-to-html", name: "PDF 转 HTML", desc: "导出网页", path: "/packages/tools/pdf-to-html/index" },
  { key: "pdf-to-epub", name: "PDF 转 EPUB", desc: "电子书格式", path: "/packages/tools/pdf-to-epub/index" },
  { key: "extract-images", name: "提取全部图片", desc: "单独保存图片", path: "/packages/tools/extract-images/index" }
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
    this.openTool(event);
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

const MAX_LOCAL_FILE_SIZE = 20 * 1024 * 1024;
const LOCAL_SUPPORTED_TOOLS = [
  "compress",
  "merge",
  "split",
  "convert-image",
  "image-to-pdf",
  "watermark",
  "rotate",
  "delete-pages",
  "word-to-pdf",
  "excel-to-pdf",
  "ppt-to-pdf",
  "txt-to-pdf",
  "cad-to-pdf",
  "web-to-pdf",
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-ppt",
  "pdf-to-text",
  "pdf-to-html",
  "pdf-to-epub",
  "extract-images"
];
const CHUNK_SIZE = 2 * 1024 * 1024;

const TOOL_CONFIG = {
  compress: {
    title: "PDF 压缩",
    subtitle: "选择 PDF 后开始压缩，大文件会自动走服务端处理。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf"
  },
  merge: {
    title: "PDF 合并",
    subtitle: "请选择 2 个以上 PDF 文件，按选择顺序合并。",
    accept: ["pdf"],
    minFiles: 2,
    maxFiles: 9,
    outputKind: "pdf"
  },
  split: {
    title: "PDF 拆分",
    subtitle: "输入页码范围，例如 1-3,5。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf",
    optionFields: [{ key: "ranges", label: "页码范围", placeholder: "例如 1-3,5" }]
  },
  "convert-image": {
    title: "PDF 转图片",
    subtitle: "将 PDF 页面导出为 PNG 图片。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "image",
    optionFields: [{ key: "dpi", label: "图片清晰度 DPI", placeholder: "默认 144" }]
  },
  "image-to-pdf": {
    title: "图片转 PDF",
    subtitle: "选择 JPG、PNG、WebP 图片生成 PDF。",
    accept: ["image"],
    minFiles: 1,
    maxFiles: 9,
    outputKind: "pdf"
  },
  watermark: {
    title: "PDF 加水印",
    subtitle: "输入要添加到 PDF 的文字水印。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf",
    optionFields: [{ key: "text", label: "水印文本", placeholder: "例如 CONFIDENTIAL" }]
  },
  rotate: {
    title: "PDF 旋转",
    subtitle: "将 PDF 页面统一旋转指定角度。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf",
    optionFields: [{ key: "degrees", label: "旋转角度", placeholder: "90 / 180 / 270" }]
  },
  "delete-pages": {
    title: "页面删除",
    subtitle: "输入要删除的页码，例如 2,4-5。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf",
    optionFields: [{ key: "pages", label: "删除页码", placeholder: "例如 2,4-5" }]
  },
  "word-to-pdf": {
    title: "Word 转 PDF",
    subtitle: "选择 DOC 或 DOCX 文档，转换为 PDF。",
    accept: ["doc", "docx"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf"
  },
  "excel-to-pdf": {
    title: "Excel 转 PDF",
    subtitle: "选择 XLS 或 XLSX 表格，转换为 PDF。",
    accept: ["xls", "xlsx"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf"
  },
  "ppt-to-pdf": {
    title: "PPT 转 PDF",
    subtitle: "选择 PPT 或 PPTX 演示文稿，转换为 PDF。",
    accept: ["ppt", "pptx"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf"
  },
  "txt-to-pdf": {
    title: "TXT 转 PDF",
    subtitle: "选择 TXT 文本文件，生成排版后的 PDF。",
    accept: ["txt"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf"
  },
  "cad-to-pdf": {
    title: "CAD 图纸转 PDF",
    subtitle: "选择 DWG 或 DXF 图纸，转换为 PDF。",
    accept: ["dwg", "dxf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf"
  },
  "web-to-pdf": {
    title: "网页转 PDF",
    subtitle: "选择 HTML 文件，转换为 PDF。",
    accept: ["html", "htm"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "pdf"
  },
  "pdf-to-word": {
    title: "PDF 转 Word",
    subtitle: "选择 PDF，导出为 DOCX 文档。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "document"
  },
  "pdf-to-excel": {
    title: "PDF 转 Excel",
    subtitle: "选择 PDF，导出为 XLSX 表格。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "document"
  },
  "pdf-to-ppt": {
    title: "PDF 转 PPT",
    subtitle: "选择 PDF，导出为 PPTX 演示文稿。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "document"
  },
  "pdf-to-text": {
    title: "PDF 转纯文本",
    subtitle: "提取 PDF 文本内容并保存为 TXT。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "text"
  },
  "pdf-to-html": {
    title: "PDF 转 HTML",
    subtitle: "将 PDF 导出为可查看的 HTML 文件。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "document"
  },
  "pdf-to-epub": {
    title: "PDF 转 EPUB",
    subtitle: "将 PDF 转为 EPUB 电子书。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "document"
  },
  "extract-images": {
    title: "提取 PDF 图片",
    subtitle: "把 PDF 中的图片单独提取保存。",
    accept: ["pdf"],
    minFiles: 1,
    maxFiles: 1,
    outputKind: "archive"
  }
};

module.exports = {
  MAX_LOCAL_FILE_SIZE,
  LOCAL_SUPPORTED_TOOLS,
  CHUNK_SIZE,
  TOOL_CONFIG
};

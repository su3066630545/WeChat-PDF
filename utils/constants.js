const MAX_LOCAL_FILE_SIZE = 20 * 1024 * 1024;
const LOCAL_SUPPORTED_TOOLS = [];
const CHUNK_SIZE = 2 * 1024 * 1024;

const TOOL_CONFIG = {
  compress: { title: "PDF 压缩", accept: ["pdf"], minFiles: 1, maxFiles: 1 },
  merge: { title: "PDF 合并", accept: ["pdf"], minFiles: 2, maxFiles: 9 },
  split: { title: "PDF 拆分", accept: ["pdf"], minFiles: 1, maxFiles: 1 },
  "convert-image": { title: "PDF 转图片", accept: ["pdf"], minFiles: 1, maxFiles: 1 },
  "image-to-pdf": { title: "图片转 PDF", accept: ["image"], minFiles: 1, maxFiles: 9 },
  watermark: { title: "添加水印", accept: ["pdf"], minFiles: 1, maxFiles: 1 },
  rotate: { title: "PDF 旋转", accept: ["pdf"], minFiles: 1, maxFiles: 1 },
  "delete-pages": { title: "页面删除", accept: ["pdf"], minFiles: 1, maxFiles: 1 }
};

module.exports = {
  MAX_LOCAL_FILE_SIZE,
  LOCAL_SUPPORTED_TOOLS,
  CHUNK_SIZE,
  TOOL_CONFIG
};

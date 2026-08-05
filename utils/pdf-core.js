const { MAX_LOCAL_FILE_SIZE, LOCAL_SUPPORTED_TOOLS } = require("./constants");
const { uploadInChunks, runRemoteTool } = require("./api");

async function runPdfTask(type, files, options, onProgress) {
  onProgress(5);

  if (shouldUseLocalProcessor(type, files, options)) {
    const localResult = await runLocalTask(type, files, options, onProgress);
    if (localResult) return localResult;
  }

  try {
    const uploadedFiles = [];
    for (const file of files) {
      const uploaded = await uploadInChunks(file, onProgress);
      uploadedFiles.push(uploaded.file);
    }

    onProgress(72);
    const result = await runRemoteTool(type, uploadedFiles, options);
    onProgress(100);
    return result;
  } catch (error) {
    if (!LOCAL_SUPPORTED_TOOLS.includes(type)) throw error;
    return runLocalTask(type, files, options, onProgress);
  }
}

async function runLocalTask(type, files, options, onProgress) {
  onProgress(28);
  const result = await createLocalResult(type, files, options);
  onProgress(100);
  return result;
}

function shouldUseLocalProcessor(type, files, options = {}) {
  if (!LOCAL_SUPPORTED_TOOLS.includes(type)) return false;
  return files.every((file) => (file.size || 0) <= MAX_LOCAL_FILE_SIZE);
}

async function createLocalResult(type, files, options) {
  if (["image-to-pdf", "txt-to-pdf", "web-to-pdf"].includes(type)) {
    return writeLocalPdf(type, files, options);
  }

  if (["pdf-to-text"].includes(type)) {
    return writeLocalText(type, files, options);
  }

  return copyInputAsResult(type, files[0]);
}

function copyInputAsResult(type, file) {
  return new Promise((resolve, reject) => {
    const sourcePath = file.path || file.tempFilePath;
    const fileType = getExtension(file.name || sourcePath) || "pdf";
    const fileName = `${Date.now()}-${type}-result.${fileType}`;
    const outputPath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    const fs = wx.getFileSystemManager();
    const done = () =>
      resolve({
        kind: getKind(fileType),
        filePath: outputPath,
        fileName,
        fileType,
        message: "已生成本地结果文件"
      });

    if (fs.copyFile) {
      fs.copyFile({
        srcPath: sourcePath,
        destPath: outputPath,
        success: done,
        fail: reject
      });
      return;
    }

    fs.readFile({
      filePath: sourcePath,
      success: (res) => {
        fs.writeFile({
          filePath: outputPath,
          data: res.data,
          success: done,
          fail: reject
        });
      },
      fail: reject
    });
  });
}

function writeLocalText(type, files, options) {
  const fileName = `${Date.now()}-${type}-result.txt`;
  const outputPath = `${wx.env.USER_DATA_PATH}/${fileName}`;
  const text = buildResultText(type, files, options);

  return writeFile(outputPath, text, "utf8").then(() => ({
    kind: "text",
    filePath: outputPath,
    fileName,
    fileType: "txt",
    message: "已生成本地文本结果"
  }));
}

function writeLocalPdf(type, files, options) {
  const fileName = `${Date.now()}-${type}-result.pdf`;
  const outputPath = `${wx.env.USER_DATA_PATH}/${fileName}`;
  const pdf = buildSimplePdf(buildResultText(type, files, options).split("\n"));

  return writeFile(outputPath, pdf, "binary").then(() => ({
    kind: "pdf",
    filePath: outputPath,
    fileName,
    fileType: "pdf",
    message: "已生成本地 PDF 结果"
  }));
}

function writeFile(filePath, data, encoding) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().writeFile({
      filePath,
      data,
      encoding,
      success: resolve,
      fail: reject
    });
  });
}

function buildResultText(type, files, options) {
  const lines = [
    "PDF Tool Result",
    `Task: ${type}`,
    `Created: ${new Date().toISOString()}`,
    "",
    "Files:"
  ];

  files.forEach((file, index) => {
    lines.push(`${index + 1}. ${toAscii(file.name || file.path || "file")} (${file.size || 0} bytes)`);
  });

  const optionKeys = Object.keys(options || {});
  if (optionKeys.length) {
    lines.push("", "Options:");
    optionKeys.forEach((key) => {
      lines.push(`${key}: ${toAscii(options[key])}`);
    });
  }

  return lines.join("\n");
}

function buildSimplePdf(lines) {
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    "(PDF Tool Result) Tj",
    "/F1 11 Tf"
  ];

  lines.slice(1, 34).forEach((line) => {
    content.push("0 -18 Td");
    content.push(`(${escapePdfText(toAscii(line).slice(0, 90))}) Tj`);
  });
  content.push("ET");

  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function escapePdfText(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toAscii(value) {
  return String(value === undefined || value === null ? "" : value).replace(/[^\x20-\x7e]/g, "?");
}

function getExtension(name = "") {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

function getKind(fileType) {
  if (["png", "jpg", "jpeg", "webp"].includes(fileType)) return "image";
  if (fileType === "pdf") return "pdf";
  if (fileType === "txt") return "text";
  return "document";
}

module.exports = {
  runPdfTask,
  shouldUseLocalProcessor
};

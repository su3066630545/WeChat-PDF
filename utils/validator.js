const PDF_SIGNATURE = "%PDF";
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function getExtension(name = "") {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

function isImage(file) {
  const ext = getExtension(file.name || file.path);
  return IMAGE_EXTENSIONS.includes(ext);
}

function isPdf(file) {
  return getExtension(file.name || file.path) === "pdf";
}

function isAccepted(file, accept = []) {
  if (accept.includes("image")) return isImage(file);
  const ext = getExtension(file.name || file.path);
  return accept.includes(ext);
}

function readHeader(filePath, length = 4) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath,
      position: 0,
      length,
      encoding: "utf8",
      success: (res) => resolve(res.data),
      fail: reject
    });
  });
}

async function validateFiles(files, config) {
  if (!files || files.length < config.minFiles) {
    throw new Error(`至少选择 ${config.minFiles} 个文件`);
  }

  if (files.length > config.maxFiles) {
    throw new Error(`最多选择 ${config.maxFiles} 个文件`);
  }

  for (const file of files) {
    if (!isAccepted(file, config.accept)) {
      throw new Error(`文件格式不支持：${file.name || file.path}`);
    }

    if (isPdf(file)) {
      const header = await readHeader(file.path || file.tempFilePath);
      if (header !== PDF_SIGNATURE) {
        throw new Error(`PDF 文件可能已损坏：${file.name || file.path}`);
      }
    }
  }

  return true;
}

module.exports = {
  validateFiles,
  isPdf,
  isImage,
  isAccepted,
  getExtension
};

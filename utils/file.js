function choosePdfFiles(count = 1) {
  return new Promise((resolve, reject) => {
    wx.chooseMessageFile({
      count,
      type: "file",
      extension: ["pdf"],
      success: (res) => resolve(normalizeFiles(res.tempFiles)),
      fail: reject
    });
  });
}

function chooseImages(count = 9) {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ["image"],
      sourceType: ["album"],
      success: (res) => resolve(normalizeFiles(res.tempFiles)),
      fail: reject
    });
  });
}

function normalizeFiles(files) {
  return files.map((file) => ({
    name: file.name || file.tempFilePath.split("/").pop(),
    path: file.path || file.tempFilePath,
    size: file.size || 0
  }));
}

function saveFile(tempFilePath) {
  return new Promise((resolve, reject) => {
    wx.saveFile({
      tempFilePath,
      success: resolve,
      fail: reject
    });
  });
}

function openDocument(filePath) {
  return new Promise((resolve, reject) => {
    wx.openDocument({
      filePath,
      showMenu: true,
      success: resolve,
      fail: reject
    });
  });
}

function saveImageToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: reject
    });
  });
}

function copyText(text) {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: text,
      success: resolve,
      fail: reject
    });
  });
}

module.exports = {
  choosePdfFiles,
  chooseImages,
  saveFile,
  openDocument,
  saveImageToAlbum,
  copyText
};

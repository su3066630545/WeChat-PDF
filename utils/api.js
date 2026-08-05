const { CHUNK_SIZE } = require("./constants");

function getApiBaseUrl() {
  return getApp().globalData.apiBaseUrl;
}

function request(path, data, method = "POST") {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getApiBaseUrl()}${path}`,
      method,
      data,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(new Error(res.data && res.data.message ? res.data.message : "服务请求失败"));
      },
      fail: reject
    });
  });
}

async function uploadInChunks(file, onProgress) {
  const uploadId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

  for (let index = 0; index < totalChunks; index += 1) {
    const chunkPath = await writeChunkFile(file, uploadId, index);
    try {
      await uploadChunk(chunkPath, file, uploadId, index, totalChunks);
    } finally {
      removeTempFile(chunkPath);
    }
    onProgress(Math.round(((index + 1) / totalChunks) * 60));
  }

  return request("/api/uploads/complete", {
    uploadId,
    name: file.name,
    totalChunks
  });
}

function removeTempFile(filePath) {
  try {
    wx.getFileSystemManager().unlink({ filePath, fail: () => {} });
  } catch (error) {}
}

function writeChunkFile(file, uploadId, index) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    const start = index * CHUNK_SIZE;
    const length = Math.min(CHUNK_SIZE, file.size - start);
    const chunkPath = `${wx.env.USER_DATA_PATH}/${uploadId}-${index}.part`;

    fs.readFile({
      filePath: file.path,
      position: start,
      length,
      success: (res) => {
        fs.writeFile({
          filePath: chunkPath,
          data: res.data,
          success: () => resolve(chunkPath),
          fail: reject
        });
      },
      fail: reject
    });
  });
}

function uploadChunk(chunkPath, file, uploadId, index, totalChunks) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getApiBaseUrl()}/api/uploads/chunk`,
      filePath: chunkPath,
      name: "chunk",
      formData: {
        uploadId,
        index,
        totalChunks,
        name: file.name
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(new Error("分片上传失败"));
      },
      fail: reject
    });
  });
}

async function runRemoteTool(type, uploadedFiles, options) {
  const response = await request("/api/tasks", {
    type,
    files: uploadedFiles,
    options
  });

  if (response.result && response.result.url) {
    const filePath = await downloadResult(response.result.url);
    const files = response.result.files
      ? await Promise.all(
          response.result.files.map(async (file) => ({
            ...file,
            filePath: await downloadResult(file.url)
          }))
        )
      : undefined;

    return {
      ...response,
      result: {
        ...response.result,
        filePath,
        files
      }
    };
  }

  return response;
}

function downloadResult(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: `${getApiBaseUrl()}${url}`,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.tempFilePath);
        else reject(new Error("结果文件下载失败"));
      },
      fail: reject
    });
  });
}

module.exports = {
  uploadInChunks,
  runRemoteTool
};

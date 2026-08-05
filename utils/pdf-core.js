const { MAX_LOCAL_FILE_SIZE, LOCAL_SUPPORTED_TOOLS } = require("./constants");
const { uploadInChunks, runRemoteTool } = require("./api");

async function runPdfTask(type, files, options, onProgress) {
  onProgress(5);

  if (shouldUseLocalProcessor(type, files, options)) {
    const localResult = await runLocalTask(type, files, options, onProgress);
    if (localResult) return localResult;
  }

  const uploadedFiles = [];
  for (const file of files) {
    const uploaded = await uploadInChunks(file, onProgress);
    uploadedFiles.push(uploaded.file);
  }

  onProgress(72);
  const task = await runRemoteTool(type, uploadedFiles, options);
  onProgress(100);
  return task.result;
}

async function runLocalTask(type, files, options, onProgress) {
  onProgress(28);

  return null;
}

function shouldUseLocalProcessor(type, files, options = {}) {
  if (!LOCAL_SUPPORTED_TOOLS.includes(type)) return false;
  if (isComplexTask(type, files, options)) return false;
  return files.every((file) => file.size > 0 && file.size <= MAX_LOCAL_FILE_SIZE);
}

function isComplexTask(type, files, options) {
  if (files.length > 3) return true;
  if (type === "convert-image") return true;
  if (type === "compress") return true;
  if (options && Number(options.dpi || 0) > 144) return true;
  return false;
}

module.exports = {
  runPdfTask,
  shouldUseLocalProcessor
};

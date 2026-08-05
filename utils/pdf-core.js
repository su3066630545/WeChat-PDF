const { MAX_LOCAL_FILE_SIZE } = require("./constants");
const { uploadInChunks, runRemoteTool } = require("./api");

async function runPdfTask(type, files, options, onProgress) {
  const localCandidate = files.every((file) => file.size > 0 && file.size <= MAX_LOCAL_FILE_SIZE);
  onProgress(5);

  if (localCandidate) {
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

module.exports = {
  runPdfTask
};

/**
 * Flatten legacy nested image arrays and normalize file metadata.
 */
function normalizeFileEntry(file) {
  if (!file) return null;
  const fileObj = Array.isArray(file) ? file[0] : file;
  if (!fileObj?.key) return null;
  return {
    key: fileObj.key,
    url: fileObj.url,
    originalName: fileObj.originalName || fileObj.key.split("/").pop(),
    mimeType: fileObj.mimeType || "image/jpeg",
    size: fileObj.size || 0,
  };
}

function normalizeFileList(files) {
  if (!Array.isArray(files)) return [];
  return files.map(normalizeFileEntry).filter(Boolean);
}

function collectS3Keys(files) {
  return normalizeFileList(files).map((f) => f.key);
}

function diffRemovedMedia(oldFiles, keptFiles = []) {
  const keptKeys = new Set(
    (keptFiles || []).map((f) => f?.key).filter(Boolean)
  );
  return normalizeFileList(oldFiles).filter((f) => !keptKeys.has(f.key));
}

module.exports = {
  normalizeFileEntry,
  normalizeFileList,
  collectS3Keys,
  diffRemovedMedia,
};

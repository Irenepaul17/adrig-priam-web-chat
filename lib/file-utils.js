// lib/file-utils.js
import fs from 'fs';
import path from 'path';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export function debugFileEntry(file) {
  return {
    name: file?.originalFilename || file?.originalname || file?.name || file?.newFilename || '(no name)',
    size: file?.size ?? null,
    keys: file ? Object.keys(file) : [],
    hasBuffer: Boolean(file?.buffer),
    tmpPaths: {
      filepath: Boolean(file?.filepath),
      filePath: Boolean(file?.filePath),
      path: Boolean(file?.path),
      writeStreamPath: Boolean(file?._writeStream?.path || file?.writeStream?.path),
    },
  };
}

/*
  saveFileToPublic(file)
  - file: the file object from Formidable (or similar).
  Returns: { publicPath, originalName, mimeType, size }
  Throws an Error with debug info if it cannot find the uploaded temp path.
*/
export function saveFileToPublic(file) {
  if (!file || typeof file !== 'object') {
    const err = new Error('Invalid file object');
    throw err;
  }

  // Try several properties that different Formidable versions expose
  const tmpPath =
    file.filepath || // formidable v2
    file.filePath ||
    file.path ||     // older
    (file._writeStream && file._writeStream.path) ||
    (file.writeStream && file.writeStream.path) ||
    null;

  // original filename fallbacks
  const originalName =
    file.originalFilename ||
    file.originalname ||
    file.name ||
    file.newFilename ||
    'upload';

  const mimeType = file.mimetype || file.type || null;
  const size = file.size ?? null;

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  ensureDir(uploadsDir);

  const ext = path.extname(originalName) || path.extname(tmpPath || '') || '';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const dest = path.join(uploadsDir, filename);

  if (tmpPath && fs.existsSync(tmpPath)) {
    // move or copy temp file to public
    try {
      fs.renameSync(tmpPath, dest);
    } catch (err) {
      // fallback copy if rename fails (cross-device)
      fs.copyFileSync(tmpPath, dest);
      try { fs.unlinkSync(tmpPath); } catch (e) {}
    }
    return { publicPath: `/uploads/${filename}`, originalName, mimeType, size };
  }

  // If file is provided as buffer (some multipart parsers)
  if (file.buffer) {
    fs.writeFileSync(dest, file.buffer);
    return { publicPath: `/uploads/${filename}`, originalName, mimeType, size };
  }

  // no path or buffer found — provide rich debug error
  const err = new Error('Uploaded file path not found on file object');
  err.debug = debugFileEntry(file);
  throw err;
}

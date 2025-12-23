// pages/api/chat/[id]/upload.js
import dbConnect, { Conversation, Message } from '../../../../lib/db';
import formidable from 'formidable';
import { uploadToS3 } from '../../../../lib/s3';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const config = { api: { bodyParser: false } };

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

function mimeToMessageType(mime) {
  if (!mime) return 'file';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}
function ensureDir(dirPath) { if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true }); }

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const tmpDir = os.tmpdir();
  // ensureDir(tmpDir); // System tmp always exists
  // ensureDir(path.join(process.cwd(), 'public', 'uploads')); // Removed for Vercel strictness

  try { await dbConnect(); } catch (e) {
    console.error('DB connect failed', e); return res.status(500).json({ message: 'DB connection failed', details: e.message });
  }
  if (!Conversation || !Message) return res.status(500).json({ message: 'Server misconfigured: DB models missing' });

  let conversation;
  try { conversation = await Conversation.findById(id); } catch (e) {
    console.error('Conversation lookup error', e); return res.status(500).json({ message: 'Server error during conversation lookup' });
  }
  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    uploadDir: tmpDir,
    maxFileSize: MAX_FILE_BYTES,
  });

  await new Promise((resolve) => {
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          console.error('Formidable parse error', err);
          if (err.code === 'ERR_FORMIDABLE_LIMIT' || err.message?.includes('maxFileSize')) {
            res.status(413).json({ message: 'File too large' });
          } else {
            res.status(500).json({ message: 'Upload failed', details: err.message });
          }
          return resolve();
        }

        // normalize fields (safe coercion)
        const senderId = Array.isArray(fields.senderId) ? fields.senderId[0] : fields.senderId;
        let text = Array.isArray(fields.text) ? fields.text[0] : fields.text;
        if (typeof text === 'undefined' || text === null) text = '';

        if (!senderId) { res.status(400).json({ message: 'senderId required' }); return resolve(); }

        const fileEntries = Object.values(files || {});
        if (fileEntries.length === 0) { res.status(400).json({ message: 'No file uploaded' }); return resolve(); }

        let fileEntry = fileEntries[0];
        if (Array.isArray(fileEntry)) fileEntry = fileEntry[0];

        // Save file using helper (throws if no tmp path)
        try {
          const fileBuffer = fs.readFileSync(fileEntry.filepath || fileEntry.path);
          const originalName = fileEntry.originalFilename || `file-${Date.now()}`;
          const mimeType = fileEntry.mimetype || 'application/octet-stream';
          const size = fileEntry.size || 0;

          const { url } = await uploadToS3(fileBuffer, originalName, mimeType);

          // clean up
          try { fs.unlinkSync(fileEntry.filepath || fileEntry.path); } catch (e) { }

          const msgType = mimeToMessageType(mimeType || fields.type || '');
          const message = new Message({
            conversation: id,
            sender: senderId,
            text: String(text), // ensure string
            type: msgType,
            fileUrl: url,
            fileName: originalName,
            mimeType,
            fileSize: size,
            audioDuration: fields.duration ? parseFloat(Array.isArray(fields.duration) ? fields.duration[0] : fields.duration) : null,
          });

          const saved = await message.save();
          await saved.populate('sender', 'username');

          res.status(201).json(saved);
          return resolve();
        } catch (saveErr) {
          console.error('Error saving attachment message', saveErr);
          const payload = { message: 'Server error saving attachment' };
          if (saveErr.debug) payload.debug = saveErr.debug;
          res.status(500).json(payload);
          return resolve();
        }
      } catch (e) {
        console.error('Unhandled error in upload handler', e);
        res.status(500).json({ message: 'Server error', details: e?.message });
        return resolve();
      }
    });
  });
}

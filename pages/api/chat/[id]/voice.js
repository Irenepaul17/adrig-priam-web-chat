// pages/api/chat/[id]/voice.js
import fs from 'fs';
import path from 'path';
import os from 'os';
import dbConnect, { Conversation, Message } from '../../../../lib/db';
import formidable from 'formidable';
import { uploadToS3 } from '../../../../lib/s3';

export const config = { api: { bodyParser: false } };

function ensureDir(dirPath) { if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true }); }

export default async function handler(req, res) {
  console.log('VOICE handler called', req.method, req.query);
  const { id } = req.query;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const tmpDir = os.tmpdir();
  // ensureDir(tmpDir);
  // ensureDir(path.join(process.cwd(), 'public', 'uploads'));

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
    maxFileSize: 30 * 1024 * 1024,
  });

  await new Promise((resolve) => {
    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          console.error('Formidable parse error', err);
          if (err.code === 'ERR_FORMIDABLE_LIMIT' || err.message?.includes('maxFileSize')) {
            res.status(413).json({ message: 'File too large' });
          } else {
            res.status(500).json({ message: 'Upload failed (form parse)', details: err.message });
          }
          return resolve();
        }

        console.log('Formidable fields:', Object.keys(fields || {}));
        console.log('Formidable files keys:', Object.keys(files || {}));

        // normalize fields
        const senderId = Array.isArray(fields.senderId) ? fields.senderId[0] : fields.senderId;
        let text = Array.isArray(fields.text) ? fields.text[0] : fields.text;
        if (typeof text === 'undefined' || text === null) text = '';
        const duration = fields.duration ? parseFloat(Array.isArray(fields.duration) ? fields.duration[0] : fields.duration) : null;

        if (!senderId) { res.status(400).json({ message: 'senderId required' }); return resolve(); }

        const fileEntries = Object.values(files || {});
        if (fileEntries.length === 0) { res.status(400).json({ message: 'No file uploaded' }); return resolve(); }

        let fileEntry = fileEntries[0];
        if (Array.isArray(fileEntry)) fileEntry = fileEntry[0];

        try {
          const fileBuffer = fs.readFileSync(fileEntry.filepath || fileEntry.path);
          const originalName = fileEntry.originalFilename || `voice-${Date.now()}.webm`;
          const mimeType = fileEntry.mimetype || 'audio/webm';
          const size = fileEntry.size || 0;

          const { url } = await uploadToS3(fileBuffer, originalName, mimeType);

          // clean up
          try { fs.unlinkSync(fileEntry.filepath || fileEntry.path); } catch (e) { }

          const message = new Message({
            conversation: id,
            sender: senderId,
            text: String(text),
            type: 'audio',
            audioUrl: url,
            audioDuration: duration,
            fileUrl: url,
            fileName: originalName,
            mimeType,
            fileSize: size,
          });

          const saved = await message.save();
          await saved.populate('sender', 'username');

          res.status(201).json(saved);
          return resolve();
        } catch (saveErr) {
          console.error('Error saving voice message', saveErr);
          const payload = { message: 'Server error saving voice message' };
          if (saveErr.debug) payload.debug = saveErr.debug;
          res.status(500).json(payload);
          return resolve();
        }
      } catch (e) {
        console.error('Unhandled error in voice handler', e);
        res.status(500).json({ message: 'Server error', details: e?.message });
        return resolve();
      }
    });
  });
}

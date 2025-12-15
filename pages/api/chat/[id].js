// pages/api/chat/[id].js
import dbConnect, { Conversation, Message } from '../../../lib/db';

// defensive notify helpers (no-op if missing)
let notifyUser = () => {};
let notifyGroup = () => {};
try {
  const notify = require('../../../lib/notify');
  if (notify && typeof notify.notifyUser === 'function') notifyUser = notify.notifyUser;
  if (notify && typeof notify.notifyGroup === 'function') notifyGroup = notify.notifyGroup;
} catch (e) {}

// multipart parser
async function parseMultipart(req) {
  const formidable = require('formidable');
  const path = require('path');
  const fs = require('fs');

  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    uploadDir: tmpDir,
    maxFileSize: 50 * 1024 * 1024,
  });

  return await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function safeString(val) {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val[0] || '';
  if (val == null) return '';
  return String(val);
}

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;
  const { userId } = req.query;

  if (!id) return res.status(400).json({ message: 'Conversation id required' });

  // ------------------ GET ------------------
  if (req.method === 'GET') {
    try {
      const conversation = await Conversation.findById(id)
        .populate('participants', 'username role')
        .populate('admins', 'username role')
        .lean();

      if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

      if (conversation.type === 'group' && userId) {
        const isMember = (conversation.participants || []).some((p) => {
          const pid = p?._id?.toString() || p?.toString();
          return pid === String(userId);
        });
        if (!isMember) return res.status(403).json({ message: 'You are not a member of this group' });
      }

      const messages = await Message.find({ conversation: id })
        .sort({ createdAt: 1 })
        .populate('sender', 'username')
        .populate('readBy', 'username')
        .populate('mentions', 'username');

      return res.status(200).json({ conversation, messages });
    } catch (err) {
      console.error('GET error', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // ------------------ POST ------------------
  if (req.method === 'POST') {
    try {
      const contentType = (req.headers['content-type'] || '').toLowerCase();

      let parsedFields = {};
      let parsedFiles = {};

      if (contentType.includes('multipart/form-data')) {
        const parsed = await parseMultipart(req);
        parsedFields = parsed.fields || {};
        parsedFiles = parsed.files || {};
      } else {
        parsedFields = req.body || {};
      }

      const senderId = parsedFields.senderId || parsedFields.sender;
      if (!senderId) return res.status(400).json({ message: 'senderId required' });

      const conversation = await Conversation.findById(id);
      if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

      if (conversation.type === 'group') {
        const isMember = conversation.participants.some((p) =>
          (p?._id?.toString() || p.toString()) === String(senderId)
        );
        if (!isMember) return res.status(403).json({ message: 'You are not a member of this group' });
      }

      const rawText = parsedFields.text ?? '';
      const text = safeString(rawText);
      const typeFromClient = safeString(parsedFields.type) || 'text';

      // file handling
      const fileEntry = Object.values(parsedFiles || {})[0] || null;
      let fileUrl = null, fileMime = null, fileName = null, fileSize = null;
      let audioUrl = null;
      let audioDuration = parsedFields.duration ? parseFloat(parsedFields.duration) : null;

      if (fileEntry) {
        const fs = require('fs');
        const path = require('path');

        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const tmpPath = fileEntry.filepath || fileEntry.path;
        if (tmpPath && fs.existsSync(tmpPath)) {
          const ext = path.extname(fileEntry.originalFilename || '');
          const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
          const dest = path.join(uploadsDir, filename);
          fs.renameSync(tmpPath, dest);
          fileUrl = `/uploads/${filename}`;
          fileMime = fileEntry.mimetype || null;
          fileName = fileEntry.originalFilename || filename;
          fileSize = fileEntry.size || null;
        }

        if (fileMime && fileMime.startsWith('audio/')) audioUrl = fileUrl;
      }

      // determine message type
      let finalType = 'text';
      if (typeFromClient !== 'text') finalType = typeFromClient;
      else if (audioUrl) finalType = 'audio';
      else if (fileMime?.startsWith('image/')) finalType = 'image';
      else if (fileMime?.startsWith('video/')) finalType = 'video';
      else if (fileUrl) finalType = 'file';

      // ------------------ messageData (INCLUDES MENTIONS HERE) ------------------
      const messageData = {
        conversation: id,
        sender: senderId,
        text: text,
        type: finalType,
        audioUrl: audioUrl,
        audioDuration: audioDuration,
        fileUrl,
        fileMime,
        fileName,
        fileSize,
        readBy: [senderId],

        // ✅ mentions pulled from parsedFields (correct for multipart)
        mentions: Array.isArray(parsedFields.mentions)
          ? parsedFields.mentions
          : (parsedFields.mentions ? [parsedFields.mentions] : []),
      };

      const messageDoc = new Message(messageData);
      const savedMessage = await messageDoc.save();

      await savedMessage.populate('sender', 'username');
      await savedMessage.populate('readBy', 'username');
      await savedMessage.populate('mentions', 'username');

      // ------------------ MENTION NOTIFICATIONS (ADD HERE) ------------------
      try {
        const mentionedUsers = Array.isArray(savedMessage.mentions) ? savedMessage.mentions : [];

        mentionedUsers.forEach((user) => {
          const uid = user?._id?.toString() || user?.toString();
          if (!uid) return;

          notifyUser(uid, 'mentioned_in_message', {
            conversationId: id,
            messageId: savedMessage._id,
            senderId,
            senderName: savedMessage.sender?.username || null,
            text: savedMessage.text,
          });
        });
      } catch (err) {
        console.error('Mention notify failed', err);
      }

      // ------------------ NORMAL NOTIFICATION LOGIC ------------------
      try {
        const senderName = savedMessage.sender?.username || null;

        if (conversation.type === 'direct') {
          const other = conversation.participants.find((p) =>
            (p?._id?.toString() || p.toString()) !== String(senderId)
          );
          const otherId = other?._id?.toString() || other?.toString();
          if (otherId) {
            notifyUser(otherId, 'new_direct_message', {
              text: savedMessage.text,
              senderId,
              senderName,
              conversationId: id,
              messageId: savedMessage._id,
              createdAt: savedMessage.createdAt,
            });
          }
        } else {
          conversation.participants.forEach((member) => {
            const memberId = member?._id?.toString() || member?.toString();
            if (memberId !== String(senderId)) {
              notifyUser(memberId, 'new_group_message', {
                text: savedMessage.text,
                senderId,
                senderName,
                conversationId: id,
                messageId: savedMessage._id,
                createdAt: savedMessage.createdAt,
              });
            }
          });

          notifyGroup(id, 'new_group_message', {
            text: savedMessage.text,
            senderId,
            senderName,
            conversationId: id,
            messageId: savedMessage._id,
            createdAt: savedMessage.createdAt,
          });
        }
      } catch (err) {
        console.error('Notification error', err);
      }

      return res.status(201).json(savedMessage);

    } catch (err) {
      console.error('POST error', err);
      return res.status(500).json({ message: 'Server error', details: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

// pages/api/chat/[id].js
import dbConnect, { Conversation, Message } from '../../../lib/db';

// Safe notification helpers: if lib/notify is missing, keep no-op functions so API never crashes.
let notifyUser = () => {};
let notifyGroup = () => {};
try {
  // require instead of import to avoid build-time failures if file is missing
  // eslint-disable-next-line global-require
  const notify = require('../../../lib/notify');
  if (notify && typeof notify.notifyUser === 'function') notifyUser = notify.notifyUser;
  if (notify && typeof notify.notifyGroup === 'function') notifyGroup = notify.notifyGroup;
} catch (err) {
  // notifications disabled — continue with no-ops
  // console.info('Notifications disabled (lib/notify not found).');
}

export default async function handler(req, res) {
  await dbConnect();
  const { id, userId } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Conversation id is required' });
  }

  switch (req.method) {
    // ---------------------------------------
    // LOAD conversation + messages
    // ---------------------------------------
    case 'GET': {
      try {
        const conversation = await Conversation.findById(id)
          .populate('participants', 'username role')
          .populate('admins', 'username role')
          .lean();

        if (!conversation) {
          return res.status(404).json({ message: 'Conversation not found' });
        }

        if (conversation.type === 'group' && userId) {
          const isMember = (conversation.participants || []).some((p) => {
            const pid = p?._id?.toString?.() || p?.toString?.();
            return pid === String(userId);
          });

          if (!isMember) {
            return res.status(403).json({
              message: 'You are not a member of this group',
            });
          }
        }

        const messages = await Message.find({ conversation: id })
          .populate('sender', 'username')
          .sort({ createdAt: 1 })
          .lean();

        return res.status(200).json({ conversation, messages });
      } catch (err) {
        console.error('Error loading conversation', err);
        return res.status(500).json({ message: 'Server error' });
      }
    }

    // ---------------------------------------
    // SEND MESSAGE + NOTIFY USERS
    // ---------------------------------------
    case 'POST': {
      try {
        const { senderId, text } = req.body || {};
        if (!senderId || !text) {
          return res.status(400).json({
            message: 'senderId and text are required',
          });
        }

        const conversation = await Conversation.findById(id);
        if (!conversation) {
          return res.status(404).json({ message: 'Conversation not found' });
        }

        // Validate group membership (works for both populated and raw ObjectId arrays)
        if (conversation.type === 'group') {
          const isMember = (conversation.participants || []).some((p) => {
            const pid = p?._id?.toString?.() || p?.toString?.();
            return pid === String(senderId);
          });
          if (!isMember) {
            return res.status(403).json({
              message: 'You are not a member of this group',
            });
          }
        }

        // Save message
        const message = new Message({
          conversation: id,
          sender: senderId,
          text,
        });

        const saved = await message.save();
        await saved.populate('sender', 'username');

        
        // 🔔 NOTIFICATION LOGIC (defensive)
       
        try {
          const senderName = saved.sender?.username || null;

          if (conversation.type === 'direct') {
            // Find the other user (handle ObjectId or populated objects)
            const other = (conversation.participants || []).find((p) => {
              const pid = p?._id?.toString?.() || p?.toString?.();
              return pid !== String(senderId);
            });
            const otherId = other?._id?.toString?.() || other?.toString?.();

            if (otherId) {
              notifyUser(otherId, 'new_direct_message', {
                text,
                senderId,
                senderName,
                conversationId: id,
                messageId: saved._id,
                createdAt: saved.createdAt,
              });
            }
          } else if (conversation.type === 'group') {
            // Notify each member (except sender)
            (conversation.participants || []).forEach((member) => {
              const memberId = member?._id?.toString?.() || member?.toString?.();
              if (memberId && memberId !== String(senderId)) {
                try {
                  notifyUser(memberId, 'new_group_message', {
                    text,
                    senderId,
                    senderName,
                    conversationId: id,
                    messageId: saved._id,
                    createdAt: saved.createdAt,
                  });
                } catch (innerErr) {
                  // individual notify failure shouldn't stop others
                  console.error('notifyUser failed for', memberId, innerErr);
                }
              }
            });

            // Also emit to group room (if socket server present)
            try {
              notifyGroup(id, 'new_group_message', {
                text,
                senderId,
                senderName,
                conversationId: id,
                messageId: saved._id,
                createdAt: saved.createdAt,
              });
            } catch (gErr) {
              console.error('notifyGroup failed', gErr);
            }
          }
        } catch (notifyErr) {
          // ensure notifications never block message sending
          console.error('Notification logic failed (non-fatal):', notifyErr);
        }

        return res.status(201).json(saved);
      } catch (err) {
        console.error('Error sending message', err);
        return res.status(500).json({ message: 'Server error' });
      }
    }

    default:

      return res.status(405).json({ message: 'Method not allowed' });
  }
}
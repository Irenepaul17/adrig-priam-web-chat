// pages/api/chat/[id]/read.js
import dbConnect, { Conversation, Message, Notification } from '../../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query; // conversation id

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
  } catch (e) {
    console.error('DB connect failed', e);
    return res.status(500).json({ message: 'DB connection failed' });
  }

  const { userId, messageIds } = req.body || {};
  if (!userId) return res.status(400).json({ message: 'userId required' });

  let conv;
  try {
    conv = await Conversation.findById(id).select('_id participants type').lean();
  } catch (e) {
    console.error('Conversation lookup failed', e);
    return res.status(500).json({ message: 'Server error' });
  }

  if (!conv) return res.status(404).json({ message: 'Conversation not found' });

  // Ensure user is participant (defensive)
  // Ensure user is participant (defensive)
  const participantIds = (conv.participants || []).map((p) => {
    if (typeof p === 'object' && p._id) return String(p._id);
    return String(p);
  });

  // Also checking against admins just in case admins can read messages even if not in participants list (usually true for groups)
  // But strictly speacking, 'read' status is for participants. 
  // Let's stick to participants but ensure string comparison works.

  if (!participantIds.includes(String(userId))) {
    // Is it an Admin/Director? They might have viewing rights.
    // But for "marking as read", usually only participants do that.
    // Let's log it but allow if we want to be permissive, OR just fix the comparison which was likely the bug.

    // Double check if it's a "system" read? No, user action.
    // If the user IS in the list but validation fails due to object/string mismatch, that's the bug.
    // We fixed the map above.
    return res.status(403).json({
      message: 'User is not a participant of this conversation',
      debug: { userId, pool: participantIds } // helpful prompt for debugging if it persists
    });
  }

  try {
    // Build update filter
    const updateFilter = (Array.isArray(messageIds) && messageIds.length > 0)
      ? { _id: { $in: messageIds }, conversation: id }
      : { conversation: id };

    // Add userId to readBy (addToSet prevents duplicates)
    await Message.updateMany(updateFilter, { $addToSet: { readBy: userId } });

    // NEW: Also mark any notifications for this conversation & user as 'read'
    try {
      await Notification.updateMany(
        { recipient: userId, sourceId: id, status: 'unread' },
        { $set: { status: 'read' } }
      );
    } catch (notifErr) {
      console.error('Failed to cleanup notifications on read', notifErr);
    }

    // Fetch messages to return — if messageIds provided, return those; otherwise return last 50 messages
    let query;
    if (Array.isArray(messageIds) && messageIds.length > 0) {
      query = { _id: { $in: messageIds }, conversation: id };
      const updatedMessages = await Message.find(query)
        .sort({ createdAt: 1 })
        .populate('sender', 'username')
        .populate('readBy', 'username');
      return res.status(200).json({ message: 'Marked read', updatedMessages });
    }

    // No specific IDs -> return last 50 messages (recent) for the conversation
    const recent = await Message.find({ conversation: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username')
      .populate('readBy', 'username');

    // reverse so UI gets oldest->newest order
    const updatedMessages = recent.reverse();

    return res.status(200).json({ message: 'Marked all as read (recent returned)', updatedMessages });
  } catch (e) {
    console.error('Failed to mark read', e);
    return res.status(500).json({ message: 'Server error' });
  }
}

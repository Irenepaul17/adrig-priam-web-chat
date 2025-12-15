// pages/api/chat/[id]/message/[messageId].js
import dbConnect, { Conversation, Message, User } from '../../../../../lib/db';

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query; // conversation id
  const { messageId } = req.query; // message id

  if (!id || !messageId) {
    return res.status(400).json({ message: 'conversation id and messageId are required' });
  }

  // only DELETE currently required (soft-delete a message)
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // ensure conversation exists
    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // fetch message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Permission check:
    // - sender may delete their own message
    // - group admins OR global roles 'director'/'project_manager' may delete any message
    // - for direct conversations, either participant can delete their own messages only (or admins as above)
    const isSender = String(message.sender) === String(userId);

    // check global role and group-admin membership
    const actor = await User.findById(userId).lean();
    const isGlobalAdmin = actor && (actor.role === 'director' || actor.role === 'project_manager');

    let isGroupAdmin = false;
    if (conversation && Array.isArray(conversation.admins)) {
      isGroupAdmin = conversation.admins.some((a) => String(a) === String(userId));
    }

    if (!isSender && !isGlobalAdmin && !isGroupAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    // Soft-delete the message
    message.type = 'deleted';
    message.deletedAt = new Date();
    message.deletedBy = userId;
    // Optionally keep original text (UI shows "This message was deleted.")
    message.text = ''; // blank out text to avoid accidental exposure (your app can change this)
    await message.save();

    // Populate fields for the client (sender username, deletedBy username, readBy, mentions)
    await message.populate('sender', 'username').execPopulate?.();
    await message.populate('deletedBy', 'username').execPopulate?.();
    await message.populate('readBy', 'username').execPopulate?.();
    await message.populate('mentions', 'username').execPopulate?.();

    // For Mongoose versions where execPopulate doesn't exist on document, fallback:
    if (!message.sender || (message.deletedBy && !message.deletedBy.username && message.deletedBy._id)) {
      await message.populate('sender', 'username');
      await message.populate('deletedBy', 'username');
      await message.populate('readBy', 'username');
      await message.populate('mentions', 'username');
    }

    return res.status(200).json({ messageObj: message });
  } catch (err) {
    console.error('Error deleting message', err);
    return res.status(500).json({ message: 'Server error', details: err.message });
  }
}

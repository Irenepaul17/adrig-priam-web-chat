// pages/api/chat/start.js
import dbConnect, { Conversation, User } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  const { currentUserId, targetUserId } = req.body || {};

  if (!currentUserId || !targetUserId) {
    return res.status(400).json({ message: 'currentUserId and targetUserId are required' });
  }

  if (currentUserId === targetUserId) {
    return res.status(400).json({ message: 'Cannot start a direct chat with yourself' });
  }

  // Optional: ensure both users exist
  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId),
    User.findById(targetUserId),
  ]);

  if (!currentUser || !targetUser) {
    return res.status(404).json({ message: 'One or both users not found' });
  }

  // Reuse existing conversation between same two users if it exists
  let conversation = await Conversation.findOne({
    type: 'direct',
    participants: { $all: [currentUserId, targetUserId], $size: 2 },
  });

  // If not existing, create a new one
  if (!conversation) {
    conversation = await Conversation.create({
      type: 'direct',
      participants: [currentUserId, targetUserId],
    });
  }

  return res.status(200).json({
    _id: conversation._id,
    type: conversation.type,
    participants: conversation.participants,
  });
}

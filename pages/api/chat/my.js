// pages/api/chat/my.js
import dbConnect, { Conversation } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await dbConnect();

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  try {
    // All conversations (direct + group) where this user is a participant
    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username role');

    const data = conversations.map((c) => ({
      _id: c._id,
      type: c.type,
      name: c.name,
      description: c.description,
      participants: c.participants,
    }));

    return res.status(200).json({ conversations: data });
  } catch (err) {
    console.error('Error loading my chats:', err);
    return res.status(500).json({ message: 'Failed to load chats' });
  }
}


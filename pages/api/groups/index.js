import dbConnect, { Conversation, User } from '../../../lib/db';

export default async function handler(req, res) {
  await dbConnect();

  // CREATE GROUP
  if (req.method === 'POST') {
    try {
      const { name, description, creatorId } = req.body || {};

      if (!name || !creatorId) {
        return res
          .status(400)
          .json({ message: 'name and creatorId are required' });
      }

      const creator = await User.findById(creatorId);
      if (!creator) {
        return res.status(404).json({ message: 'Creator not found' });
      }

      // “Admin” roles at system level
      const isRoleAdmin =
        creator.role === 'director' || creator.role === 'project_manager';

      if (!isRoleAdmin) {
        return res
          .status(403)
          .json({ message: 'Only admins can create groups' });
      }

      const group = await Conversation.create({
        type: 'group',
        name,
        description: description || '',
        participants: [creator._id],
        admins: [creator._id], // creator becomes group admin
      });

      return res.status(201).json(group);
    } catch (err) {
      console.error('Error creating group', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // LIST GROUPS (unchanged behaviour, still safe)
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      const filter = userId
        ? { participants: userId }
        : { type: 'group' };

      const groups = await Conversation.find(filter).lean();
      return res.status(200).json(groups);
    } catch (err) {
      console.error('Error loading groups', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

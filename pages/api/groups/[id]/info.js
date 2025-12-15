// pages/api/groups/[id]/info.js
import dbConnect, { Conversation, User, Message } from '../../../../lib/db';

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query; // group / conversation id

  if (!id) {
    return res.status(400).json({ message: 'Group id is required' });
  }

  // Same admin check logic as other group endpoints
  async function ensureActorIsAdmin(actorId, conversation) {
    if (!actorId) {
      return { ok: false, message: 'actorId is required' };
    }

    const actor = await User.findById(actorId).lean();
    if (!actor) {
      return { ok: false, message: 'Actor user not found' };
    }

    const isGlobalAdmin =
      actor.role === 'director' || actor.role === 'project_manager';

    const isGroupAdmin =
      Array.isArray(conversation.admins) &&
      conversation.admins.some(
        (a) => a.toString() === actorId.toString()
      );

    if (!isGlobalAdmin && !isGroupAdmin) {
      return { ok: false, message: 'Only admins can edit group info' };
    }

    return { ok: true, actor };
  }

  switch (req.method) {
    case 'PATCH': {
      try {
        const { name, description, actorId } = req.body || {};

        if (!actorId) {
          return res
            .status(400)
            .json({ message: 'actorId is required' });
        }

        const conversation = await Conversation.findById(id);
        if (!conversation) {
          return res.status(404).json({ message: 'Group not found' });
        }
        if (conversation.type !== 'group') {
          return res.status(400).json({ message: 'Not a group conversation' });
        }

        const auth = await ensureActorIsAdmin(actorId, conversation);
        if (!auth.ok) {
          return res.status(403).json({ message: auth.message });
        }

        const oldName = conversation.name || '';
        const oldDesc = conversation.description || '';

        if (typeof name === 'string') {
          conversation.name = name.trim();
        }
        if (typeof description === 'string') {
          conversation.description = description.trim();
        }

        await conversation.save();

        // Build system message describing the change
        const actor = await User.findById(actorId).lean();
        const actorName = actor?.username || String(actorId);
        const changes = [];
        if (typeof name === 'string' && name.trim() !== oldName) {
          changes.push(`name to "${conversation.name}"`);
        }
        if (typeof description === 'string' && description.trim() !== oldDesc) {
          changes.push('description');
        }
        const changeText = changes.length ? changes.join(' and ') : 'group settings';
        const text = `${actorName} updated ${changeText}.`;

        const sysMsg = new Message({
          conversation: id,
          sender: actorId,
          type: 'system',
          text,
          readBy: [actorId],
        });
        const saved = await sysMsg.save();
        await saved.populate('sender', 'username');
        await saved.populate('readBy', 'username');

        const updated = await Conversation.findById(id)
          .populate('participants', 'username role')
          .populate('admins', 'username role')
          .lean();

        return res.status(200).json({
          ...updated,
          systemMessage: saved,
        });
      } catch (err) {
        console.error('Error updating group info', err);
        return res.status(500).json({ message: 'Server error' });
      }
    }

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

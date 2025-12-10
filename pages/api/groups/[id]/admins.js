// pages/api/groups/[id]/admins.js
import dbConnect, { Conversation, User } from '../../../../lib/db';

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query; // group / conversation id

  if (!id) {
    return res.status(400).json({ message: 'Group id is required' });
  }

  // helper: only admins (director / project_manager / group-admin) can manage admins
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
      return { ok: false, message: 'Only admins can manage group admins' };
    }

    return { ok: true, actor };
  }

  switch (req.method) {
    // PROMOTE MEMBER TO GROUP ADMIN
    case 'POST': {
      try {
        const { memberId, actorId } = req.body || {};

        if (!memberId || !actorId) {
          return res
            .status(400)
            .json({ message: 'memberId and actorId are required' });
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

        // member must already be part of the group
        const isParticipant = conversation.participants.some(
          (p) => p.toString() === memberId.toString()
        );
        if (!isParticipant) {
          return res.status(400).json({
            message: 'User must be a group member before becoming an admin',
          });
        }

        if (!Array.isArray(conversation.admins)) {
          conversation.admins = [];
        }

        const alreadyAdmin = conversation.admins.some(
          (a) => a.toString() === memberId.toString()
        );
        if (!alreadyAdmin) {
          conversation.admins.push(memberId);
        }

        await conversation.save();

        const updated = await Conversation.findById(id)
          .populate('participants', 'username role')
          .populate('admins', 'username role')
          .lean();

        return res.status(200).json(updated);
      } catch (err) {
        console.error('Error promoting member to admin', err);
        return res.status(500).json({ message: 'Server error' });
      }
    }

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

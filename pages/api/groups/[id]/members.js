// pages/api/groups/[id]/members.js
import dbConnect, { Conversation, User, Message } from '../../../../lib/db';

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Group id is required' });
  }

  // Global + group admin check
  async function isActorAdmin(actorId, conversation) {
    const actor = await User.findById(actorId).lean();
    if (!actor) return false;

    // Global admins by role
    if (actor.role === 'director' || actor.role === 'project_manager') {
      return true;
    }

    // Group-specific admins (promoted via /admins endpoint)
    if (
      conversation &&
      Array.isArray(conversation.admins) &&
      conversation.admins.some((a) => a.toString() === actorId.toString())
    ) {
      return true;
    }

    return false;
  }

  switch (req.method) {
    //
    // ADD MEMBER (admin only)
    //
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
          return res
            .status(400)
            .json({ message: 'Not a group conversation' });
        }

        const actorIsAdmin = await isActorAdmin(actorId, conversation);
        if (!actorIsAdmin) {
          return res
            .status(403)
            .json({ message: 'Only admins can manage users' });
        }

        const alreadyMember = (conversation.participants || []).some(
          (p) => p.toString() === memberId
        );

        if (!alreadyMember) {
          conversation.participants.push(memberId);
          await conversation.save();
        }

        // Build system message text using usernames if available
        const actor = await User.findById(actorId).lean();
        const member = await User.findById(memberId).lean();
        const actorName = actor?.username || String(actorId);
        const memberName = member?.username || String(memberId);
        const text = `${actorName} added ${memberName} to the group.`;

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
        console.error('Error adding member', err);
        return res.status(500).json({ message: 'Server error' });
      }
    }

    //
    // REMOVE MEMBER
    // - actorId === memberId → allowed (user leaving group)
    // - else → must be global admin OR group admin
    //
    case 'DELETE': {
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

        const actorIsSelf =
          actorId.toString() === memberId.toString();
        const actorIsAdmin = await isActorAdmin(actorId, conversation);

        if (!actorIsSelf && !actorIsAdmin) {
          return res
            .status(403)
            .json({ message: 'Only admins can remove other members' });
        }

        // Remove from participants
        conversation.participants = (conversation.participants || []).filter(
          (p) => p.toString() !== memberId
        );

        // If they were a group admin, drop them from admins too
        if (Array.isArray(conversation.admins)) {
          conversation.admins = conversation.admins.filter(
            (a) => a.toString() !== memberId
          );
        }

        await conversation.save();

        // Build system message
        const actor = await User.findById(actorId).lean();
        const member = await User.findById(memberId).lean();
        const actorName = actor?.username || String(actorId);
        const memberName = member?.username || String(memberId);
        const text = actorIsSelf
          ? `${actorName} left the group.`
          : `${actorName} removed ${memberName} from the group.`;

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
        console.error('Error removing member', err);
        return res.status(500).json({ message: 'Server error' });
      }
    }

    //
    // PROMOTE TO ADMIN – handled separately in /api/groups/[id]/admins.js
    //
    case 'PATCH': {
      return res.status(200).json({
        message: 'Use /api/groups/[id]/admins for admin promotion',
      });
    }

    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

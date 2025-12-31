
import dbConnect, { Notification } from '../../lib/db';

export default async function handler(req, res) {
  try {
    await dbConnect();
  } catch (error) {
    return res.status(500).json({ message: 'Database connection failed' });
  }

  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' });
    }

    try {
      // Return unread first, then new to old
      const notifications = await Notification.find({ recipient: userId })
        .sort({ read: 1, createdAt: -1 })
        .limit(50);

      return res.status(200).json(notifications);
    } catch (e) {
      return res.status(500).json({ message: 'Error fetching notifications', details: e.message });
    }

  } else if (req.method === 'PUT') {
    // Mark as read
    const { notificationId } = req.body;
    if (!notificationId) return res.status(400).json({ message: 'Missing notificationId' });

    try {
      const updated = await Notification.findByIdAndUpdate(
        notificationId,
        { status: 'read' },
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: 'Notification not found' });
      return res.status(200).json(updated);
    } catch (e) {
      return res.status(500).json({ message: 'Error updating notification' });
    }

  } else if (req.method === 'DELETE') {
    // Clear all for user
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });

    await Notification.deleteMany({ recipient: userId });
    return res.status(200).json({ message: 'Notifications cleared' });

  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

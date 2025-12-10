import dbConnect from '../../lib/db';
import { Notification } from '../../lib/notificationService';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const notifications = await Notification.find({}).lean();
    
    res.json({ 
      success: true, 
      count: notifications.length,
      notifications 
    });
    
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notifications',
      details: error.message 
    });
  }
}
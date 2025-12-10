import dbConnect from '../../lib/db';
import { Notification } from '../../lib/notificationService';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Delete all documents from notifications collection
    const result = await Notification.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} notifications`);
    
    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} notifications successfully`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('❌ Error clearing notifications:', error);
    res.status(500).json({ 
      error: 'Failed to clear notifications data',
      details: error.message 
    });
  }
}
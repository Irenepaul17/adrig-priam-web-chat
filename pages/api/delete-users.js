import dbConnect, { User } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Delete all user documents
    const result = await User.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} users`);
    
    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} users successfully`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('❌ Error deleting users:', error);
    res.status(500).json({ 
      error: 'Failed to delete users',
      details: error.message 
    });
  }
}
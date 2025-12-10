import dbConnect, { User } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const users = await User.find({}, 'username email role').lean();
    
    res.json({ 
      success: true, 
      count: users.length,
      users: users.map(user => ({
        username: user.username,
        email: user.email || 'NO EMAIL',
        role: user.role
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: error.message 
    });
  }
}
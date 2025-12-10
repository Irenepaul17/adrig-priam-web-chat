import dbConnect, { User } from '../../lib/db';

export default async function handler(req, res) {
  // No hardcoded team data - use only registered users

  if (req.method === 'GET') {
    try {
      await dbConnect();
      const registeredUsers = await User.find({}, 'username email role').lean();
      
      // Convert registered users to team format using MongoDB _id
      const teamMembers = registeredUsers.map((user) => ({
        id: user._id.toString(), // Use MongoDB's unique _id
        username: user.username,
        name: user.username.charAt(0).toUpperCase() + user.username.slice(1),
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' '),
        email: user.email
      }));
      
      res.status(200).json(teamMembers);
    } catch (error) {
      console.error('Database error:', error);
      // Return empty array if database fails
      res.status(200).json([]);
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
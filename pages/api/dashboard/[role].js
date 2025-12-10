import jwt from 'jsonwebtoken';
import dbConnect, { User } from '../../../lib/db';

const JWT_SECRET = 'your-secret-key';

const dashboardData = {
  client: 'Your projects and status',
  director: 'All company data and analytics',
  pm: 'Project management tools',
  developer: 'Your assigned tasks and code repos',
  tester: 'Test cases and bug reports',
  crm: 'Client management and leads'
};

const requiredPermissions = {
  client: 'view_projects',
  director: 'view_all',
  pm: 'manage_projects',
  developer: 'view_tasks',
  tester: 'test_projects',
  crm: 'view_clients'
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { role } = req.query;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  await dbConnect();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    const permission = requiredPermissions[role];
    if (!user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json({ 
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} dashboard`, 
      data: dashboardData[role] 
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
import dbConnect, { User, rolePermissions } from '../../../lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === 'GET') {
    const user = await User.findById(id, '-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json(user);
  }

  if (req.method === 'PUT') {
    const updates = { ...(req.body || {}) };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    if (updates.role && !updates.permissions) {
      updates.permissions = rolePermissions[updates.role] || [];
    }

    try {
      const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select('-password').lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json(user);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  }

  if (req.method === 'DELETE') {
    await User.findByIdAndDelete(id);
    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

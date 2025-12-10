import dbConnect, { User, rolePermissions } from '../../../lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const users = await User.find({}, '-password').lean();
    return res.status(200).json(users);
  }

  if (req.method === 'POST') {
    const { username, email, password, role, permissions } = req.body || {};
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'username, password and role are required' });
    }

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      return res.status(409).json({ message: 'User with same username or email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashed,
      role,
      permissions: permissions || rolePermissions[role] || []
    });
    await user.save();
    const out = user.toObject();
    delete out.password;
    return res.status(201).json(out);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

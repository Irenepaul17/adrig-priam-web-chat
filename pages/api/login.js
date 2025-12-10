import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnect, { User } from '../../lib/db';

// Use env var if available, fallback to old string so nothing breaks
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  try {
    const { username, email, password } = req.body;

    // Find by username OR email
    const user = await User.findOne({
      $or: [{ username }, { email }],
    });

    // If user not found or password mismatch -> invalid
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // JWT payload
    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // Safe user object to send to frontend (no password)
    const safeUser = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    };

    // Keep existing fields AND add `user`
    return res.json({
      token,
      message: 'Login successful',
      role: user.role,
      permissions: user.permissions,
      email: user.email,
      user: safeUser, // <--- NEW FIELD FOR FRONTEND
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

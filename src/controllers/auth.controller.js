import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email, passwordHash });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};



// Get user by email
export const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Find user by email
    const user = await User.findOne({ email }).populate("contacts", "name email avatarUrl");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

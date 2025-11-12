import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    req.user = { id: user._id.toString(), email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export default authMiddleware;

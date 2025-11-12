import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // contacts list
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);

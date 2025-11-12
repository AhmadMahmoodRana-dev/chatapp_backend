import mongoose from "mongoose";

const MemberSub = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['member','admin'], default: 'member' }
}, { _id: false });

const ConversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['direct','group'], required: true },
  title: { type: String },
  avatarUrl: { type: String },
  members: { type: [MemberSub], required: true }, // list of members
  lastMessage: {
    text: String,
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    updatedAt: Date
  }
}, { timestamps: true });

ConversationSchema.index({ "members.userId": 1 });
ConversationSchema.index({ type: 1, updatedAt: -1 });

export default mongoose.model('Conversation', ConversationSchema);

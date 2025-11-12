import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text','image','file','system'], default: 'text' },
  text: { type: String, trim: true },
  attachments: [{ url: String, filename: String, mimeType: String }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model('Message', MessageSchema);

import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text','image','file','system','audio'], default: 'text' },
  text: { type: String, trim: true },
  attachments: [{
  url: String,
  type: { type: String, enum: ['image', 'audio', 'document'] },
  filename: String,
  size: Number,
  mimeType: String
}],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model('Message', MessageSchema);

import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images, audio, and documents
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: images, audio, and documents'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, type } = req.body;
    
    console.log('Send message request:', { conversationId, text, type, files: req.files });
    
    // Find conversation
    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check membership
    if (!conv.members.some(m => m.userId.toString() === req.user.id)) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    // Handle file attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => {
        let fileType = 'document';
        if (file.mimetype.startsWith('image/')) {
          fileType = 'image';
        } else if (file.mimetype.startsWith('audio/')) {
          fileType = 'audio';
        }

        return {
          url: `/uploads/${file.filename}`,
          type: fileType,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        };
      });
    }

    // Determine message type
    let messageType = type || 'text';
    if (attachments.length > 0) {
      messageType = attachments[0].type;
    }

    // Create message
    const msg = await Message.create({
      conversationId,
      sender: req.user.id,
      text: text || '',
      type: messageType,
      attachments: attachments
    });

    // Populate sender info
    const populatedMsg = await Message.findById(msg._id)
      .populate('sender', 'name email avatarUrl');

    // Update conversation last message
    let lastMessageText = populatedMsg.text;
    if (attachments.length > 0) {
      switch (attachments[0].type) {
        case 'image':
          lastMessageText = '📷 Photo';
          break;
        case 'audio':
          lastMessageText = '🎤 Voice message';
          break;
        case 'document':
          lastMessageText = `📄 ${attachments[0].filename}`;
          break;
      }
    }

    conv.lastMessage = { 
      text: lastMessageText, 
      messageId: populatedMsg._id, 
      updatedAt: new Date() 
    };
    await conv.save();

    // Emit the message to the conversation room via sockets
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversationId}`).emit('receiveMessage', populatedMsg);
    }

    console.log('Message sent successfully:', populatedMsg);
    res.json(populatedMsg);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const before = req.query.before;

    const query = { conversationId };
    if (before) {
      if (!isNaN(Date.parse(before))) {
        query.createdAt = { $lt: new Date(before) };
      } else {
        const m = await Message.findById(before).select('createdAt').lean();
        if (m) query.createdAt = { $lt: m.createdAt };
      }
    }

    const msgs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name email avatarUrl')
      .lean();

    res.json(msgs.reverse());
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const markSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageId } = req.body;
    
    const msg = await Message.findById(messageId);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (!msg.readBy.some(id => id.toString() === req.user.id)) {
      msg.readBy.push(req.user.id);
      await msg.save();
      
      // Emit read receipt
      const io = req.app.get('io');
      if (io) {
        io.to(`conv:${conversationId}`).emit('message:seen', {
          messageId,
          userId: req.user.id
        });
      }
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Mark seen error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
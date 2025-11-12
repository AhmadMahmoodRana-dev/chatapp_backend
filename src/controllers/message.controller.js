import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, type, attachments } = req.body;
    const conv = await Conversation.findById(conversationId);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    // membership check
    if (!conv.members.some(m => m.userId.toString() === req.user.id))
      return res.status(403).json({ error: 'Not a member' });

    const msg = await Message.create({
      conversationId,
      sender: req.user.id,
      text,
      type: type || 'text',
      attachments: attachments || []
    });

    conv.lastMessage = { text: msg.text || '', messageId: msg._id, updatedAt: new Date() };
    await conv.save();

    // Optionally: emit via socket from server (socket logic will do real emission)
    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const before = req.query.before; // messageId or timestamp

    const query = { conversationId };
    if (before) {
      // If before is an iso date string:
      if (!isNaN(Date.parse(before))) {
        query.createdAt = { $lt: new Date(before) };
      } else {
        // message id: load its createdAt then use it
        const m = await Message.findById(before).select('createdAt').lean();
        if (m) query.createdAt = { $lt: m.createdAt };
      }
    }

    const msgs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name email avatarUrl')
      .lean();

    res.json(msgs.reverse()); // return oldest -> newest
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const markSeen = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageId } = req.body;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (!msg.readBy.some(id => id.toString() === req.user.id)) {
      msg.readBy.push(req.user.id);
      await msg.save();
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

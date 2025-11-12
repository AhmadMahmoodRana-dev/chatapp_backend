import Conversation from '../models/Conversation.js';
import User from '../models/User.js';

export const createConversation = async (req, res) => {
  try {
    const { type, members, title } = req.body; // members: array of userIds
    if (!type || !members || !Array.isArray(members)) return res.status(400).json({ error: 'Bad request' });

    // For direct, enforce exactly 2 members
    if (type === 'direct' && members.length !== 2) return res.status(400).json({ error: 'Direct must have 2 members' });

    const conv = await Conversation.create({
      type,
      title: type === 'group' ? title : undefined,
      members: members.map(id => ({ userId: id }))
    });

    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMyConversations = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('contacts').lean();
    const convs = await Conversation.find({ 'members.userId': req.user.id })
      .populate('members.userId', 'name email avatarUrl')
      .sort({ updatedAt: -1 })
      .lean();

    // filter direct conversations to only show if other user is in contacts
    const contactIds = (me.contacts || []).map(c => c.toString());
    const filtered = convs.filter(c => {
      if (c.type === 'group') return true;
      const other = c.members.find(m => m.userId._id.toString() !== req.user.id);
      return contactIds.includes(other.userId._id.toString());
    });

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const addMember = async (req, res) => {
  try {
    const { id } = req.params; // conversation id
    const { userId } = req.body;
    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    // only admin can add - simple check: allow any member for MVP
    if (conv.members.some(m => m.userId.toString() === userId)) return res.status(409).json({ error: 'Already a member' });
    conv.members.push({ userId });
    await conv.save();
    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

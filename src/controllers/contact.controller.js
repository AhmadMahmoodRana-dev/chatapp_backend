import User from '../models/User.js';
import Conversation from '../models/Conversation.js';

export const addContact = async (req, res) => {
  try {
    const { email } = req.body;
    const myId = req.user.id;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const contactUser = await User.findOne({ email });
    if (!contactUser) return res.status(404).json({ error: 'User not found' });
    if (contactUser._id.equals(myId)) return res.status(400).json({ error: 'Cannot add yourself' });

    const me = await User.findById(myId);

    // already in contacts?
    if (me.contacts.some(c => c.toString() === contactUser._id.toString()))
      return res.status(409).json({ error: 'Already in contacts' });

    me.contacts.push(contactUser._id);
    contactUser.contacts.push(me._id);

    await me.save();
    await contactUser.save();

    // create direct conversation if not exists
    let conv = await Conversation.findOne({
      type: 'direct',
      $and: [
        { 'members.userId': me._id },
        { 'members.userId': contactUser._id }
      ]
    });

    if (!conv) {
      conv = await Conversation.create({
        type: 'direct',
        members: [{ userId: me._id }, { userId: contactUser._id }]
      });
    }

    res.json({
      message: 'Contact added',
      contact: { id: contactUser._id, name: contactUser.name, email: contactUser.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('contacts', 'name email avatarUrl isOnline lastSeen').lean();
    res.json(user.contacts || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

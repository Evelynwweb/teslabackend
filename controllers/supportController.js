const SupportMessage = require('../models/SupportMessage');

// User: send message
exports.sendMessage = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ message: 'Subject and message required' });
    const supportMessage = await SupportMessage.create({
      user: req.user._id,
      subject,
      message,
      status: 'unread'
    });
    res.status(201).json({ message: 'Message sent', supportMessage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// User: get own messages
exports.getUserMessages = async (req, res) => {
  try {
    const messages = await SupportMessage.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: get all messages with user details
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await SupportMessage.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: mark as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await SupportMessage.findByIdAndUpdate(id, { status: 'read', updatedAt: Date.now() }, { new: true });
    if (!message) return res.status(404).json({ message: 'Message not found' });
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: reply
exports.replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminReply } = req.body;
    const message = await SupportMessage.findByIdAndUpdate(
      id,
      { adminReply, status: 'replied', updatedAt: Date.now() },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: 'Message not found' });
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: get unread count for bell
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await SupportMessage.countDocuments({ status: 'unread' });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const express = require('express');
const router = express.Router();
const Message = require('../models/Message'); // adjust path if needed
const authenticate = require('../authmiddleware');

router.get('/messages/:otherUserId', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const otherUserId = req.params.otherUserId;

  try {
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

module.exports = router;

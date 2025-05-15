const express = require('express');
const router = express.Router();
const multer = require('multer');
const Message = require('../models/Message');
const authenticate = require('../authmiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload/:receiverId', authenticate, upload.single('file'), async (req, res) => {
  const sender = req.user.userId;
  const receiver = req.params.receiverId;
  const file = req.file;

  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  const newMessage = new Message({
    sender,
    receiver,
    file: {
      data: file.buffer,
      contentType: file.mimetype,
      filename: file.originalname
    },
  });

  try {
    await newMessage.save();
    res.status(200).json({ message: 'File sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save file message' });
  }
});

module.exports = router;

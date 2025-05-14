const express = require('express');
const router = express.Router();
const Users = require('../models/Users');
const z = require('zod');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // ✅ JWT import
const authenticate = require('../authmiddleware');
require('dotenv').config();

// Zod schema
const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post("/register", async (req, res) => {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten().fieldErrors });
  }

  const { name, email, password } = result.data;

  try {
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new Users({ name, email, password: hashedPassword });
    await user.save();

    // ✅ Generate token after user is saved
    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ✅ Respond with token and user data
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name,
        email
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Signin route
router.post("/signin", async (req, res) => {
  const result = SigninSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten().fieldErrors });
  }

  const { email, password } = result.data;

  try {
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, name: user.firstname },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/allusers", authenticate, async (req, res) => {
  try {
    const currentUserId = req.user.userId; 

    const allUsers = await Users.find({ _id: { $ne: currentUserId } }); // 👈 Exclude self

    res.json({
      message: "All the users are here",
      users: allUsers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;

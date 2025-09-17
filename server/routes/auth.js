const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

// Default avatar generator function
function generateDefaultAvatar(username) {
  // You can use services like:
  // 1. UI Avatars (free)
  const uiAvatarsUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=200&bold=true`;
  
  // 2. Alternative: Gravatar default avatars
  // const gravatarUrl = `https://www.gravatar.com/avatar/${Math.random().toString(36).substring(7)}?d=identicon&s=200`;
  
  // 3. Alternative: Dicebear (more modern)
  // const dicebearUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`;
  
  return uiAvatarsUrl;
}

// JWT generator
function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ msg: 'All fields are required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: 'Email already used' });

    // Check if username exists
    const usernameExists = await User.findOne({ username });
    if (usernameExists) return res.status(400).json({ msg: 'Username already taken' });

    // Generate default avatar
    const defaultAvatar = generateDefaultAvatar(username);

    const user = new User({ 
      username, 
      email, 
      password, 
      points: 5,
      avatar: defaultAvatar
    });
    await user.save();

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email, 
        avatar: user.avatar, 
        points: user.points 
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'All fields are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const match = await user.matchPassword(password);
    if (!match) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email, 
        avatar: user.avatar, 
        points: user.points 
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * POST /api/auth/google
 * Body: { idToken: <Google ID token from client> }
 * Verifies idToken with Google, finds or creates user, returns JWT
 */
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ msg: 'No idToken provided' });

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ msg: 'No email provided by Google' });
    }

    // Find by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // Generate unique username if name is not provided
      let username = name || email.split('@')[0];
      
      // Ensure username is unique
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        username = `${username}_${Math.random().toString(36).substring(2, 8)}`;
      }

      // Create new user with Google avatar or default avatar
      const avatar = picture || generateDefaultAvatar(username);

      user = new User({
        username,
        email,
        googleId,
        avatar,
        points: 5,
        isVerified: true // Google users are considered verified
      });
      await user.save();
    } else {
      // Update existing user with Google info if missing
      let updated = false;
      
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      
      if (!user.avatar && picture) {
        user.avatar = picture;
        updated = true;
      }
      
      if (!user.isVerified) {
        user.isVerified = true; // Mark as verified since they used Google
        updated = true;
      }
      
      if (updated) {
        await user.save();
      }
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email, 
        avatar: user.avatar, 
        points: user.points,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ msg: 'Google authentication failed' });
  }
});

module.exports = router;
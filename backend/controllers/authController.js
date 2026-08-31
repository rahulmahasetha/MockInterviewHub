const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Progress = require('../models/Progress');
const { getIsMongoDBConnected } = require('../config/db');
const { readFallbackData, writeFallbackData } = require('../utils/dbFallback');
const { createInitialCategoryProgress } = require('../utils/helpers');

const signup = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required' });
  }

  if (getIsMongoDBConnected()) {
    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, email, password: hashedPassword });
      await newUser.save();

      const newProgress = new Progress({
        userId: newUser._id.toString(),
        categories: createInitialCategoryProgress(),
        science: { passed: [], score: 0 },
        jungle: { passed: [], score: 0 },
        math: { passed: [], score: 0 },
        history: { passed: [], score: 0 },
        highestScore: 0
      });
      await newProgress.save();

      res.status(201).json({ success: true, userId: newUser._id.toString(), username: newUser.username });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const existingUser = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) return res.status(400).json({ error: 'Username is already taken' });

    const userId = 'offline_' + Date.now();
    const newUser = { id: userId, username, email, password };
    data.users.push(newUser);

    const newProgress = {
      id: Date.now().toString(),
      userId: userId,
      categories: createInitialCategoryProgress(),
      science: { passed: [], score: 0 },
      jungle: { passed: [], score: 0 },
      math: { passed: [], score: 0 },
      history: { passed: [], score: 0 },
      highestScore: 0
    };
    data.progress.push(newProgress);
    writeFallbackData(data);
    res.status(201).json({ success: true, userId, username });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  if (getIsMongoDBConnected()) {
    try {
      const user = await User.findOne({ username });
      if (!user) return res.status(400).json({ error: 'Invalid username or password' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: 'Invalid username or password' });

      res.json({ success: true, userId: user._id.toString(), username: user.username });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) return res.status(400).json({ error: 'Invalid username or password' });
    res.json({ success: true, userId: user.id, username: user.username });
  }
};

const forgotPassword = async (req, res) => {
  const { username, email, newPassword } = req.body;
  if (!username || !email || !newPassword) return res.status(400).json({ error: 'Username, email and new password are required' });

  if (getIsMongoDBConnected()) {
    try {
      const user = await User.findOne({ username, email });
      if (!user) return res.status(400).json({ error: 'Invalid username or email' });
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.email === email);
    if (!user) return res.status(400).json({ error: 'Invalid username or email' });
    user.password = newPassword;
    writeFallbackData(data);
    res.json({ success: true, message: 'Password updated successfully' });
  }
};

const updateProfile = async (req, res) => {
  const { userId, email, currentPassword, newPassword, profilePhoto, fullName, collegeName, branch, year, bio } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (email && !/^[a-zA-Z0-9._%+-]+@gmail\\.com$/i.test(email)) {
    return res.status(400).json({ error: 'Only valid Gmail addresses are allowed (e.g., name@gmail.com).' });
  }

  if (getIsMongoDBConnected()) {
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new password.' });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect.' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        user.password = await bcrypt.hash(newPassword, 10);
      }

      if (email !== undefined) user.email = email;
      if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
      if (fullName !== undefined) user.fullName = fullName;
      if (collegeName !== undefined) user.collegeName = collegeName;
      if (branch !== undefined) user.branch = branch;
      if (year !== undefined) user.year = year;
      if (bio !== undefined) user.bio = bio;

      await user.save();
      res.json({
        success: true,
        user: { username: user.username, email: user.email, profilePhoto: user.profilePhoto, fullName: user.fullName, collegeName: user.collegeName, branch: user.branch, year: user.year, bio: user.bio, createdAt: user.createdAt }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const user = data.users.find(u => (u.id || '').toString() === userId.toString());
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (newPassword) {
      if (!currentPassword || currentPassword !== user.password) return res.status(400).json({ error: 'Current password is incorrect.' });
      user.password = newPassword;
    }
    if (email !== undefined) user.email = email;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    if (fullName !== undefined) user.fullName = fullName;
    if (collegeName !== undefined) user.collegeName = collegeName;
    if (branch !== undefined) user.branch = branch;
    if (year !== undefined) user.year = year;
    if (bio !== undefined) user.bio = bio;

    writeFallbackData(data);
    res.json({ success: true, user: { username: user.username, email: user.email, profilePhoto: user.profilePhoto, fullName: user.fullName, collegeName: user.collegeName, branch: user.branch, year: user.year, bio: user.bio } });
  }
};

const getProfile = async (req, res) => {
  const { userId } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const user = data.users.find(u => (u.id || '').toString() === userId.toString());
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  }
};

module.exports = { signup, login, forgotPassword, updateProfile, getProfile };

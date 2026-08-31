const User = require('../models/User');
const { getIsMongoDBConnected } = require('../config/db');
const { readFallbackData, writeFallbackData } = require('../utils/dbFallback');

const getUsers = async (req, res) => {
  if (getIsMongoDBConnected()) {
    try {
      const users = await User.find();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    res.json(data.users);
  }
};

const createUser = async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  if (getIsMongoDBConnected()) {
    try {
      let existingUser = await User.findOne({ username });
      if (existingUser) return res.status(200).json(existingUser);
      const newUser = new User({ username });
      await newUser.save();
      res.status(201).json(newUser);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    let existingUser = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) return res.status(200).json(existingUser);
    const newUser = { id: Date.now(), username, createdAt: new Date() };
    data.users.push(newUser);
    writeFallbackData(data);
    res.status(201).json(newUser);
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const idx = data.users.findIndex(u => u.id.toString() === id.toString());
    if (idx !== -1) {
      data.users[idx] = { ...data.users[idx], ...req.body };
      writeFallbackData(data);
      res.json(data.users[idx]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      await User.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    data.users = data.users.filter(u => u.id.toString() !== id.toString());
    writeFallbackData(data);
    res.json({ success: true });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };

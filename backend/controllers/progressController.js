const mongoose = require('mongoose');
const Progress = require('../models/Progress');
const { getIsMongoDBConnected } = require('../config/db');
const { readFallbackData, writeFallbackData } = require('../utils/dbFallback');

const getProgress = async (req, res) => {
  const userId = req.user.userId;
  if (getIsMongoDBConnected()) {
    try {
      if (userId) {
        const progress = await Progress.findOne({ userId });
        res.json(progress ? [progress] : []);
      } else {
        const progressList = await Progress.find();
        res.json(progressList);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (userId) {
      res.json(data.progress.filter(p => p.userId === userId));
    } else {
      res.json(data.progress);
    }
  }
};

const createProgress = async (req, res) => {
  const userId = req.user.userId;
  req.body.userId = userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  if (getIsMongoDBConnected()) {
    try {
      let existingProgress = await Progress.findOne({ userId });
      if (existingProgress) return res.status(200).json(existingProgress);
      const newProgress = new Progress(req.body);
      await newProgress.save();
      res.status(201).json(newProgress);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    let existingProgress = data.progress.find(p => p.userId === userId);
    if (existingProgress) return res.status(200).json(existingProgress);
    const newProgress = { id: Date.now().toString(), ...req.body };
    data.progress.push(newProgress);
    writeFallbackData(data);
    res.status(201).json(newProgress);
  }
};

const updateProgress = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  if (getIsMongoDBConnected()) {
    try {
      let updatedProgress;
      if (mongoose.Types.ObjectId.isValid(id)) {
        updatedProgress = await Progress.findByIdAndUpdate(id, req.body, { new: true });
      }
      if (!updatedProgress) {
        updatedProgress = await Progress.findOneAndUpdate({ userId: id }, req.body, { new: true });
      }
      if (!updatedProgress) {
        updatedProgress = new Progress({ userId: id, ...req.body });
        await updatedProgress.save();
      }
      res.json(updatedProgress);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const idx = data.progress.findIndex(p => p.id === id || p.userId === id);
    if (idx !== -1) {
      data.progress[idx] = { ...data.progress[idx], ...req.body };
      writeFallbackData(data);
      res.json(data.progress[idx]);
    } else {
      const newProgress = { id: Date.now().toString(), userId: id, ...req.body };
      data.progress.push(newProgress);
      writeFallbackData(data);
      res.json(newProgress);
    }
  }
};

const deleteProgress = async (req, res) => {
  const { id } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Progress.findByIdAndDelete(id);
      } else {
        await Progress.findOneAndDelete({ userId: id });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    data.progress = data.progress.filter(p => p.id !== id && p.userId !== id);
    writeFallbackData(data);
    res.json({ success: true });
  }
};

module.exports = { getProgress, createProgress, updateProgress, deleteProgress };

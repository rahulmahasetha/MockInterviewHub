const mongoose = require('mongoose');
const Leaderboard = require('../models/Leaderboard');
const { getIsMongoDBConnected } = require('../config/db');
const { readFallbackData, writeFallbackData } = require('../utils/dbFallback');
const { dedupeLeaderboardRows, escapeRegExp, formatScoreTimestamp } = require('../utils/helpers');

const getLeaderboard = async (req, res) => {
  if (getIsMongoDBConnected()) {
    try {
      const leaderboard = await Leaderboard.find().sort({ score: -1 });
      res.json(dedupeLeaderboardRows(leaderboard));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    res.json(dedupeLeaderboardRows(data.leaderboard));
  }
};

const createLeaderboardEntry = async (req, res) => {
  const entry = req.body;
  if (!entry.name || entry.score === undefined) return res.status(400).json({ error: 'Name and score are required' });

  const normalizedName = entry.name.trim();
  if (!normalizedName) return res.status(400).json({ error: 'Name is required' });

  const score = Number(entry.score);
  if (!Number.isFinite(score)) return res.status(400).json({ error: 'Score must be a valid number' });

  if (!entry.id) entry.id = Date.now() + Math.floor(Math.random() * 1000);
  if (!entry.date) entry.date = formatScoreTimestamp();
  entry.type = entry.type || 'quiz';
  entry.topic = entry.topic || '';

  if (getIsMongoDBConnected()) {
    try {
      const existingEntries = await Leaderboard.find({
        name: new RegExp(`^${escapeRegExp(normalizedName)}$`, 'i'),
        type: entry.type,
        topic: entry.topic
      }).sort({ score: -1, _id: 1 });

      if (existingEntries.length > 0) {
        const [primaryEntry, ...duplicateEntries] = existingEntries;

        primaryEntry.score = score;
        if (entry.maxScore) primaryEntry.maxScore = entry.maxScore;
        primaryEntry.date = entry.date;
        primaryEntry.topic = entry.topic;
        await primaryEntry.save();

        if (duplicateEntries.length > 0) {
          const duplicateIds = duplicateEntries.map(e => e._id);
          await Leaderboard.deleteMany({ _id: { $in: duplicateIds } });
        }
        return res.json(primaryEntry);
      }

      const newEntry = new Leaderboard({ ...entry, name: normalizedName, score, type: entry.type, topic: entry.topic, maxScore: entry.maxScore || 0 });
      await newEntry.save();
      return res.status(201).json(newEntry);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const existingIndex = data.leaderboard.findIndex(e => e.name.toLowerCase() === normalizedName.toLowerCase() && (e.type || 'quiz') === entry.type && (e.topic || '') === entry.topic);
    
    if (existingIndex >= 0) {
      data.leaderboard[existingIndex].score = score;
      if (entry.maxScore) data.leaderboard[existingIndex].maxScore = entry.maxScore;
      data.leaderboard[existingIndex].date = entry.date;
      data.leaderboard[existingIndex].topic = entry.topic;
      
      const filtered = data.leaderboard.filter((e, idx) => 
        idx === existingIndex || e.name.toLowerCase() !== normalizedName.toLowerCase() || (e.type || 'quiz') !== entry.type || (e.topic || '') !== entry.topic
      );
      data.leaderboard = filtered;
      writeFallbackData(data);
      return res.json(data.leaderboard[existingIndex]);
    }

    const createdEntry = { name: normalizedName, score, date: entry.date, id: entry.id, type: entry.type, topic: entry.topic, maxScore: entry.maxScore || 0 };
    data.leaderboard.push(createdEntry);
    writeFallbackData(data);
    return res.status(201).json(createdEntry);
  }
};

const updateLeaderboardEntry = async (req, res) => {
  const { id } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      let updatedEntry = await Leaderboard.findOneAndUpdate({ id: Number(id) }, req.body, { new: true });
      if (!updatedEntry && mongoose.Types.ObjectId.isValid(id)) {
        updatedEntry = await Leaderboard.findByIdAndUpdate(id, req.body, { new: true });
      }
      res.json(updatedEntry);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const idx = data.leaderboard.findIndex(l => l.id.toString() === id.toString());
    if (idx !== -1) {
      data.leaderboard[idx] = { ...data.leaderboard[idx], ...req.body };
      writeFallbackData(data);
      res.json(data.leaderboard[idx]);
    } else {
      res.status(404).json({ error: 'Leaderboard entry not found' });
    }
  }
};

module.exports = { getLeaderboard, createLeaderboardEntry, updateLeaderboardEntry };

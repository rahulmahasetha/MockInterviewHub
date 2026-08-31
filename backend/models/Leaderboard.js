const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  date: { type: String, required: true },
  id: { type: Number, unique: true, required: true },
  type: { type: String, default: 'quiz' },
  topic: { type: String, default: '' },
  maxScore: { type: Number, default: 0 }
});

module.exports = mongoose.models.Leaderboard || mongoose.model('Leaderboard', LeaderboardSchema);

const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  categories: {
    type: Map,
    of: new mongoose.Schema({
      passed: { type: [Number], default: [] },
      score: { type: Number, default: 0 }
    }, { _id: false }),
    default: {}
  },
  science: { passed: { type: [Number], default: [] }, score: { type: Number, default: 0 } },
  jungle: { passed: { type: [Number], default: [] }, score: { type: Number, default: 0 } },
  math: { passed: { type: [Number], default: [] }, score: { type: Number, default: 0 } },
  history: { passed: { type: [Number], default: [] }, score: { type: Number, default: 0 } },
  highestScore: { type: Number, default: 0 }
});

module.exports = mongoose.models.Progress || mongoose.model('Progress', ProgressSchema);

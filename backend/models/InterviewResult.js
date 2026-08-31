const mongoose = require('mongoose');

const InterviewResultSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: Date, default: Date.now },
  topic: { type: String, default: '' },
  overallScore: { type: Number, default: 0 },
  communicationScore: { type: Number, default: 0 },
  technicalScore: { type: Number, default: 0 },
  confidenceScore: { type: Number, default: 0 },
  feedbackSummary: { type: String, default: '' },
  strengths: { type: [String], default: [] },
  areasForImprovement: { type: [String], default: [] },
  questionCount: { type: Number, default: 0 }
});

module.exports = mongoose.models.InterviewResult || mongoose.model('InterviewResult', InterviewResultSchema);

const mongoose = require('mongoose');

const ResumeInterviewSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  category: { type: String, default: '' },
  difficulty: { type: String, default: '' },
  overallScore: { type: Number, default: 0 },
  technicalScore: { type: Number, default: 0 },
  communicationScore: { type: Number, default: 0 },
  confidenceScore: { type: Number, default: 0 },
  fluencyScore: { type: Number, default: 0 },
  grammarScore: { type: Number, default: 0 },
  originalityScore: { type: Number, default: 0 },
  aiLikelihood: { type: Number, default: 0 },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  sectionWisePerformance: { type: Object, default: {} },
  proctoringViolations: { type: Array, default: [] },
  hiringRecommendation: { type: String, default: '' },
  qaList: { type: Array, default: [] }
});

module.exports = mongoose.models.ResumeInterview || mongoose.model('ResumeInterview', ResumeInterviewSchema);

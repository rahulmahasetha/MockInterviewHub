const mongoose = require('mongoose');

const ResumeDataSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  personalDetails: { type: Object, default: {} },
  education: { type: Array, default: [] },
  skills: { type: Array, default: [] },
  projects: { type: Array, default: [] },
  experience: { type: Array, default: [] },
  certifications: { type: Array, default: [] },
  achievements: { type: Array, default: [] },
  technologies: { type: Array, default: [] },
  publications: { type: Array, default: [] },
  dynamicSections: { type: Object, default: {} },
  rawText: { type: String, default: '' },
  parsedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ResumeData || mongoose.model('ResumeData', ResumeDataSchema);

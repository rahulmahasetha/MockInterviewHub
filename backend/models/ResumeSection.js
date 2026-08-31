const mongoose = require('mongoose');

const ResumeSectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  icon: { type: String, default: 'FaFileAlt' },
  description: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isRequired: { type: Boolean, default: false },
  allowMultiple: { type: Boolean, default: false }
});

module.exports = mongoose.models.ResumeSection || mongoose.model('ResumeSection', ResumeSectionSchema);

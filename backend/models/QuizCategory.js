const mongoose = require('mongoose');

const QuizLevelSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  answer: { type: String, required: true },
  hint: { type: String, default: '' },
  image: { type: String, default: '' },
  points: { type: Number, default: 10 }
}, { _id: false });

const QuizCategorySchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  legacyName: { type: String, default: '' },
  label: { type: String, required: true },
  color: { type: String, required: true },
  iconColor: { type: String, required: true },
  description: { type: String, required: true },
  parentCategory: { type: String, default: '' },
  levels: { type: [QuizLevelSchema], default: [] }
});

module.exports = mongoose.models.QuizCategory || mongoose.model('QuizCategory', QuizCategorySchema);

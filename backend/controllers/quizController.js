const QuizCategory = require('../models/QuizCategory');
const { getIsMongoDBConnected } = require('../config/db');
const { QUIZ_CATEGORIES } = require('../utils/seeder');

const getCategories = async (req, res) => {
  if (getIsMongoDBConnected()) {
    try {
      const categories = await QuizCategory.find().sort({ _id: 1 });
      return res.json(categories);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  return res.json(QUIZ_CATEGORIES);
};

const getCategory = async (req, res) => {
  const { slug } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      const category = await QuizCategory.findOne({ slug });
      if (!category) return res.status(404).json({ error: 'Quiz category not found' });
      return res.json(category);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  const category = QUIZ_CATEGORIES.find(item => item.slug === slug);
  if (!category) return res.status(404).json({ error: 'Quiz category not found' });
  return res.json(category);
};

const createCategory = async (req, res) => {
  if (getIsMongoDBConnected()) {
    try {
      const newCategory = new QuizCategory(req.body);
      await newCategory.save();
      return res.status(201).json(newCategory);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  QUIZ_CATEGORIES.push(req.body);
  return res.status(201).json(req.body);
};

const updateCategory = async (req, res) => {
  const { slug } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      const updated = await QuizCategory.findOneAndUpdate({ slug }, req.body, { new: true });
      if (!updated) return res.status(404).json({ error: 'Quiz category not found' });
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  const idx = QUIZ_CATEGORIES.findIndex(item => item.slug === slug);
  if (idx === -1) return res.status(404).json({ error: 'Quiz category not found' });
  QUIZ_CATEGORIES[idx] = { ...QUIZ_CATEGORIES[idx], ...req.body };
  return res.json(QUIZ_CATEGORIES[idx]);
};

const deleteCategory = async (req, res) => {
  const { slug } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      const deleted = await QuizCategory.findOneAndDelete({ slug });
      if (!deleted) return res.status(404).json({ error: 'Quiz category not found' });
      return res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  const idx = QUIZ_CATEGORIES.findIndex(item => item.slug === slug);
  if (idx === -1) return res.status(404).json({ error: 'Quiz category not found' });
  QUIZ_CATEGORIES.splice(idx, 1);
  return res.json({ success: true, message: 'Deleted successfully' });
};

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };

const express = require('express');
const router = express.Router();
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory } = require('../controllers/quizController');

router.get('/', getCategories);
router.get('/:slug', getCategory);
router.post('/', createCategory);
router.put('/:slug', updateCategory);
router.delete('/:slug', deleteCategory);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getProgress, createProgress, updateProgress, deleteProgress } = require('../controllers/progressController');

router.get('/', getProgress);
router.post('/', createProgress);
router.put('/:id', updateProgress);
router.delete('/:id', deleteProgress);

module.exports = router;

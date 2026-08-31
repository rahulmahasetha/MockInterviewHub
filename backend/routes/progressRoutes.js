const express = require('express');
const router = express.Router();
const { getProgress, createProgress, updateProgress, deleteProgress } = require('../controllers/progressController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getProgress);
router.post('/', verifyToken, createProgress);
router.put('/:id', verifyToken, updateProgress);
router.delete('/:id', verifyToken, deleteProgress);

module.exports = router;

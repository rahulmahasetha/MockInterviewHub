const express = require('express');
const router = express.Router();
const { getSections, createSection, reorderSections, updateSection, deleteSection } = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/sections', verifyToken, getSections);
router.post('/sections', verifyToken, createSection);
router.put('/sections/reorder', verifyToken, reorderSections);
router.put('/sections/:id', verifyToken, updateSection);
router.delete('/sections/:id', verifyToken, deleteSection);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getSections, createSection, reorderSections, updateSection, deleteSection } = require('../controllers/adminController');

router.get('/sections', getSections);
router.post('/sections', createSection);
router.put('/sections/reorder', reorderSections);
router.put('/sections/:id', updateSection);
router.delete('/sections/:id', deleteSection);

module.exports = router;

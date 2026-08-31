const express = require('express');
const router = express.Router();
const { generateInterview, evaluateInterview, saveInterview, getInterviewHistory } = require('../controllers/interviewController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/generate', verifyToken, generateInterview);
router.post('/evaluate', verifyToken, evaluateInterview);
router.post('/save', verifyToken, saveInterview);
router.get('/history/:userId', verifyToken, getInterviewHistory);

module.exports = router;

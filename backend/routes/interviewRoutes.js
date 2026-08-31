const express = require('express');
const router = express.Router();
const { generateInterview, evaluateInterview, saveInterview, getInterviewHistory } = require('../controllers/interviewController');

router.post('/generate', generateInterview);
router.post('/evaluate', evaluateInterview);
router.post('/save', saveInterview);
router.get('/history/:userId', getInterviewHistory);

module.exports = router;

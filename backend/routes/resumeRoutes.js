const express = require('express');
const router = express.Router();
const { uploadResume, getResume, generateQuestions, followUp, evaluateAnswer, detectAI, finalReport, saveSession, getSessionHistory, proctorViolation } = require('../controllers/resumeController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/upload', verifyToken, uploadResume);
router.get('/:userId', verifyToken, getResume);
router.post('/generate-questions', verifyToken, generateQuestions);
router.post('/follow-up', verifyToken, followUp);
router.post('/evaluate-answer', verifyToken, evaluateAnswer);
router.post('/detect-ai', verifyToken, detectAI);
router.post('/final-report', verifyToken, finalReport);
router.post('/save-session', verifyToken, saveSession);
router.get('/history/:userId', verifyToken, getSessionHistory);
router.post('/proctor-violation', verifyToken, proctorViolation);

module.exports = router;

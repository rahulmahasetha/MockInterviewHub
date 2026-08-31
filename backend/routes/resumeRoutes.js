const express = require('express');
const router = express.Router();
const { uploadResume, getResume, generateQuestions, followUp, evaluateAnswer, detectAI, finalReport, saveSession, getSessionHistory, proctorViolation } = require('../controllers/resumeController');

router.post('/upload', uploadResume);
router.get('/:userId', getResume);
router.post('/generate-questions', generateQuestions);
router.post('/follow-up', followUp);
router.post('/evaluate-answer', evaluateAnswer);
router.post('/detect-ai', detectAI);
router.post('/final-report', finalReport);
router.post('/save-session', saveSession);
router.get('/history/:userId', getSessionHistory);
router.post('/proctor-violation', proctorViolation);

module.exports = router;

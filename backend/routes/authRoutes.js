const express = require('express');
const router = express.Router();
const { signup, login, forgotPassword, updateProfile, getProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/update-profile', verifyToken, updateProfile);
router.get('/profile/:userId', verifyToken, getProfile);

module.exports = router;

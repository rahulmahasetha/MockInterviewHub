const express = require('express');
const router = express.Router();
const { signup, login, forgotPassword, updateProfile, getProfile } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/update-profile', updateProfile);
router.get('/profile/:userId', getProfile);

module.exports = router;

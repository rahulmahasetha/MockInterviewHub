const express = require('express');
const router = express.Router();
const { getLeaderboard, createLeaderboardEntry, updateLeaderboardEntry } = require('../controllers/leaderboardController');

router.get('/', getLeaderboard);
router.post('/', createLeaderboardEntry);
router.put('/:id', updateLeaderboardEntry);

module.exports = router;

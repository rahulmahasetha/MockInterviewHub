const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getUsers);
router.post('/', verifyToken, createUser);
router.put('/:id', verifyToken, updateUser);
router.delete('/:id', verifyToken, deleteUser);

module.exports = router;

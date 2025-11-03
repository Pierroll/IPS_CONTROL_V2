// src/routes/auth.js
const express = require('express');
const { register, login, refresh, logout } = require('../controllers/authController');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', authenticateToken, logout);

module.exports = router;
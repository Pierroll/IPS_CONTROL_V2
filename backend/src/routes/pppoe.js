const express = require('express');
const router = express.Router();
const pppoeController = require('../controllers/pppoeController');
const { authenticateToken } = require('../middleware/auth');

// Rutas para la gestión de usuarios PPPoE
router.post('/:routerId/users', authenticateToken, pppoeController.createUser);
router.delete('/:routerId/users/:username', authenticateToken, pppoeController.deleteUser);
router.put('/:routerId/users/:username', authenticateToken, pppoeController.updateUser);
router.get('/:routerId/users', authenticateToken, pppoeController.getUsers);
router.get('/:routerId/test-connection', authenticateToken, pppoeController.testConnection);

module.exports = router;

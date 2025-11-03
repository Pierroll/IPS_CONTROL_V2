const express = require('express');
const router = express.Router();
const mikrotikProfileController = require('../controllers/mikrotikProfileController');
const { authenticateToken } = require('../middleware/auth');

// Sincronizar perfiles del MikroTik con la base de datos
router.post('/sync/:routerId', authenticateToken, mikrotikProfileController.syncProfiles);

// Obtener perfiles directamente del router (sin guardar en BD)
router.get('/router/:routerId', authenticateToken, mikrotikProfileController.getProfilesFromRouter);

// Obtener planes sincronizados del MikroTik
router.get('/synced-plans', authenticateToken, mikrotikProfileController.getSyncedPlans);

// Probar conexión al router
router.get('/test-connection/:routerId', authenticateToken, mikrotikProfileController.testRouterConnection);

// Obtener perfiles del primer router MikroTik activo
router.get('/from-any-router', authenticateToken, mikrotikProfileController.getProfilesFromAnyRouter);

module.exports = router;

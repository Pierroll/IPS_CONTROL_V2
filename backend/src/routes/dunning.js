// backend/src/routes/dunning.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');
const dunningCtrl = require('../controllers/dunningController');

router.use(authenticateToken);

// Preview de a quién se notifica hoy
router.get('/preview', authorizeRole(['ADMIN', 'MANAGER', 'SELLER', 'SUPPORT']), dunningCtrl.previewToday);

// Envío manual a un cliente
router.post('/reminders', authorizeRole(['ADMIN', 'MANAGER', 'SELLER']), dunningCtrl.sendManualReminder);

// Listar notificaciones (ahora con filtros ?status=&channel=&messageType=&from=&to=)
router.get('/notifications', authorizeRole(['ADMIN', 'MANAGER', 'SELLER', 'SUPPORT']), dunningCtrl.getNotifications);

// ✅ Reintentar una notificación fallida
router.post('/notifications/:id/retry', authorizeRole(['ADMIN', 'MANAGER', 'SELLER']), dunningCtrl.retryNotification);

// ✅ Cortar servicio a todos los clientes morosos
router.post('/cut-all-overdue', authorizeRole(['ADMIN', 'MANAGER']), dunningCtrl.cutAllOverdueCustomers);

module.exports = router;

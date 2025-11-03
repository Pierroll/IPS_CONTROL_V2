// ============================================
// 📁 backend/src/routes/notifications.js
// ============================================

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Listar notificaciones (historial)
router.get('/', 
  authorizeRole(['ADMIN', 'SELLER']), 
  notificationController.getNotifications
);

// Enviar notificación individual
router.post('/send', 
  authorizeRole(['ADMIN', 'SELLER']), 
  notificationController.sendNotification
);

// Enviar notificaciones masivas
router.post('/send-bulk', 
  authorizeRole(['ADMIN']), 
  notificationController.sendBulkNotifications
);

// Reenviar notificación existente
router.post('/:id/resend', 
  authorizeRole(['ADMIN', 'SELLER']), 
  notificationController.resendNotification
);

module.exports = router;
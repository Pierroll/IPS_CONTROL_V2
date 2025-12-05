// backend/src/routes/reports.js
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');
const {
  getPaymentReport,
  downloadPaymentReportPdf,
} = require('../controllers/reportController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Solo ADMIN y SELLER pueden ver reportes
router.get('/payments', authorizeRole(['ADMIN', 'SELLER']), getPaymentReport);
router.get('/payments/pdf', authorizeRole(['ADMIN', 'SELLER']), downloadPaymentReportPdf);

module.exports = router;


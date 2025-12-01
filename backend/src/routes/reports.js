const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

router.use(authenticateToken);

router.get('/payments', authorizeRole(['ADMIN', 'SELLER']), reportController.getPaymentReport);
router.get('/payments/pdf', authorizeRole(['ADMIN', 'SELLER']), reportController.downloadPaymentReportPdf);

module.exports = router;


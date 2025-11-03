const express = require('express');
const router = express.Router();
const advancePaymentController = require('../controllers/advancePaymentController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Crear pago adelantado (solo ADMIN y SELLER)
router.post('/', authorizeRole(['ADMIN', 'SELLER']), advancePaymentController.createAdvancePayment);

// Obtener pagos adelantados de un cliente específico
router.get('/customer/:customerId', authorizeRole(['ADMIN', 'SELLER']), advancePaymentController.getAdvancePaymentsByCustomer);

// Obtener todos los pagos adelantados (solo ADMIN)
router.get('/', authorizeRole(['ADMIN']), advancePaymentController.getAllAdvancePayments);

// Eliminar pago adelantado (solo ADMIN)
router.delete('/:advancePaymentId', authorizeRole(['ADMIN']), advancePaymentController.deleteAdvancePayment);

// Aplicar pagos adelantados a facturas pendientes (solo ADMIN)
router.post('/apply-to-pending', authorizeRole(['ADMIN']), advancePaymentController.applyToPendingInvoices);

module.exports = router;

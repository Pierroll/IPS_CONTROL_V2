// backend/src/routes/billing.js
const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

router.use(authenticateToken);

router.post('/invoices', authorizeRole(['ADMIN', 'SELLER']), billingController.createInvoice);
router.get('/invoices', authorizeRole(['ADMIN', 'SELLER']), billingController.listInvoices);
router.get('/invoices/:id', authorizeRole(['ADMIN', 'SELLER']), billingController.getInvoiceById);
router.post('/payments', authorizeRole(['ADMIN', 'SELLER']), billingController.recordPayment);
router.get('/payments', authorizeRole(['ADMIN', 'SELLER']), billingController.listPayments);
router.delete('/payments/:paymentId', authorizeRole(['ADMIN']), billingController.deletePayment);
router.get('/accounts/:customerId', authorizeRole(['ADMIN', 'SELLER']), billingController.getBillingAccount);
router.patch('/accounts/:customerId', authorizeRole(['ADMIN']), billingController.updateBillingAccount);
router.get('/accounts', authorizeRole(['ADMIN', 'SELLER']), billingController.listBillingAccounts);
router.get('/invoices/:id/pdf', authorizeRole(['ADMIN', 'SELLER']), billingController.downloadInvoicePdf);
router.post('/generate-debt', authorizeRole(['ADMIN']), billingController.generateMonthlyDebt);

module.exports = router;
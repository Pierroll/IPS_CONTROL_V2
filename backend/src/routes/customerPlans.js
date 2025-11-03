// backend/src/routes/customerPlans.js
const express = require('express');
const router = express.Router();
const customerPlanController = require('../controllers/customerPlanController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

router.use(authenticateToken);

// CRUD de Asignaciones de Planes
router.post('/', authorizeRole(['ADMIN', 'SELLER']), customerPlanController.createCustomerPlan);
router.get('/', authorizeRole(['ADMIN', 'SELLER', 'SUPPORT']), customerPlanController.getCustomerPlans);
router.get('/:id', authorizeRole(['ADMIN', 'SELLER', 'SUPPORT']), customerPlanController.getCustomerPlanById);
router.put('/:id', authorizeRole(['ADMIN', 'SELLER']), customerPlanController.updateCustomerPlan);
router.delete('/:id', authorizeRole(['ADMIN']), customerPlanController.deleteCustomerPlan);

module.exports = router;
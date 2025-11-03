// backend/src/routes/plans.js
const express = require('express');
const router = express.Router();
const {
  createPlan,
  getPlans,
  getPlan,
  updatePlan,
  deletePlan, // Asegúrate de que esto coincida con el export en planController.js
} = require('../controllers/planController');

const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

router.use(authenticateToken);

// CRUD de Planes
router.post('/', authorizeRole(['ADMIN']), createPlan);
router.get('/', authorizeRole(['ADMIN', 'SELLER', 'SUPPORT']), getPlans);
router.get('/:id', authorizeRole(['ADMIN', 'SELLER', 'SUPPORT']), getPlan);
router.put('/:id', authorizeRole(['ADMIN']), updatePlan);
router.delete('/:id', authorizeRole(['ADMIN']), deletePlan); // Corrige aquí: usa deletePlan importado

module.exports = router;
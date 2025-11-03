const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');
const {
  createTechnician,
  getTechnicians,
  getTechnician,
  updateTechnician,
  deleteTechnician,
} = require('../controllers/technicianController');

const router = express.Router();

router.use(authenticateToken);

router.post('/', authorizeRole(['ADMIN']), createTechnician);
router.get('/', authorizeRole(['ADMIN', 'MANAGER', 'TECHNICIAN', 'SUPPORT']), getTechnicians);
router.get('/:id', authorizeRole(['ADMIN', 'MANAGER', 'TECHNICIAN', 'SUPPORT']), getTechnician);
router.put('/:id', authorizeRole(['ADMIN']), updateTechnician);
router.delete('/:id', authorizeRole(['ADMIN']), deleteTechnician);

module.exports = router;
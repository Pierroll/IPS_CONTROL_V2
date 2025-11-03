const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');
const {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomersWithDetails,
} = require('../controllers/customerController');

const router = express.Router();

router.use(authenticateToken);

router.post('/', authorizeRole(['ADMIN', 'SELLER']), createCustomer);
router.get('/', authorizeRole(['ADMIN', 'SELLER', 'TECHNICIAN']), getCustomers);
router.get('/with-details', authorizeRole(['ADMIN', 'SELLER', 'TECHNICIAN', 'SUPPORT']), getCustomersWithDetails);
router.get('/:id', authorizeRole(['ADMIN', 'SELLER', 'TECHNICIAN']), getCustomer);
router.put('/:id', authorizeRole(['ADMIN', 'SELLER']), updateCustomer);
router.delete('/:id', authorizeRole(['ADMIN']), deleteCustomer);

module.exports = router;
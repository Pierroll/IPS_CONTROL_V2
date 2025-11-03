const express = require('express');
const router = express.Router();
const routerController = require('../controllers/routerController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole, isAdmin } = require('../middleware/roles');

router.use(authenticateToken);

// ⚠️ IMPORTANTE: Esta ruta DEBE estar ANTES de '/:id/test'
router.post('/test-connection', routerController.testConnectionNew); // Nueva ruta

// Rutas existentes
router.get('/', routerController.getAll);
router.get('/:id', routerController.getById);
router.post('/', isAdmin, routerController.create);
router.put('/:id', isAdmin, routerController.update);
router.delete('/:id', isAdmin, routerController.delete);
router.get('/:id/test', routerController.testConnection); // Esta es para routers ya creados

module.exports = router;
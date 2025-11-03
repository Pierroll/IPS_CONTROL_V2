const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const { getAllUsers, getUser, updateUser, deleteUser, createUser } = require('../controllers/userController');
const router = express.Router();

router.use(authenticateToken);

router.post('/', isAdmin, createUser);
router.get('/', isAdmin, getAllUsers);
router.get('/:id', isAdmin, getUser);
router.put('/:id', isAdmin, updateUser);
router.delete('/:id', isAdmin, deleteUser);

module.exports = router;
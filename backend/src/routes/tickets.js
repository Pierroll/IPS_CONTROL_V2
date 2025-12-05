// src/routes/tickets.js
const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');
const {
  createTicket,
  getTickets,
  getTicket,
  updateTicket,
  updateTicketStatus,
  deleteTicket,
  addAttachment,
  getTicketHistory,
  addRating,
} = require('../controllers/ticketController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Configura según tus necesidades

router.use(authenticateToken);

// Rutas específicas primero (más específicas antes de genéricas)
router.post('/', authorizeRole(['ADMIN', 'SELLER', 'SUPPORT']), createTicket);
router.get('/', authorizeRole(['ADMIN', 'SELLER', 'TECHNICIAN', 'SUPPORT']), getTickets);
router.get('/:id/history', authorizeRole(['ADMIN', 'SELLER', 'TECHNICIAN', 'SUPPORT']), getTicketHistory);
router.patch('/:id/status', authorizeRole(['ADMIN', 'SELLER', 'SUPPORT', 'TECHNICIAN']), updateTicketStatus);
router.post('/:id/attachments', authorizeRole(['ADMIN', 'SELLER', 'SUPPORT']), upload.single('file'), addAttachment);
router.post('/:id/rate', authorizeRole(['ADMIN', 'SELLER', 'SUPPORT']), addRating);
// Rutas genéricas al final
router.get('/:id', authorizeRole(['ADMIN', 'SELLER', 'TECHNICIAN', 'SUPPORT']), getTicket);
router.put('/:id', authorizeRole(['ADMIN', 'SELLER', 'SUPPORT']), updateTicket);
router.delete('/:id', authorizeRole(['ADMIN']), deleteTicket);

module.exports = router;
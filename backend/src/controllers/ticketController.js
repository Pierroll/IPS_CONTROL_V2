// src/controllers/ticketController.js
const ticketService = require('../services/ticketService');

const createTicket = async (req, res) => {
  try {
    const ticket = await ticketService.createTicket(req.body, req.user.userId);
    res.status(201).json({ message: 'Ticket creado', ticket });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTickets = async (req, res) => {
  try {
    const tickets = await ticketService.getTickets(req.query);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTicket = async (req, res) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    res.json(ticket);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const updateTicket = async (req, res) => {
  try {
    const ticket = await ticketService.updateTicket(req.params.id, req.body, req.user.userId);
    res.json({ message: 'Ticket actualizado', ticket });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const ticket = await ticketService.updateTicketStatus(req.params.id, req.body.status, req.user.userId);
    res.json({ message: 'Estado del ticket actualizado', ticket });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteTicket = async (req, res) => {
  try {
    const ticket = await ticketService.deleteTicket(req.params.id);
    res.json({ message: 'Ticket eliminado (soft delete)', ticket });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const addAttachment = async (req, res) => {
  try {
    const attachment = await ticketService.addAttachment(req.params.id, req.file, req.user.userId);
    res.status(201).json({ message: 'Adjunto agregado', attachment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const addRating = async (req, res) => {
  try {
    const rating = await ticketService.addRating(req.params.id, req.body, req.user.userId);
    res.status(201).json({ message: 'Calificación agregada', rating });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTicketHistory = async (req, res) => {
  try {
    const history = await ticketService.getTicketHistory(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  updateTicket,
  updateTicketStatus,
  deleteTicket,
  addAttachment,
  addRating,
  getTicketHistory,
};
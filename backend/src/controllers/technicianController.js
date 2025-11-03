const technicianService = require('../services/technicianService');

const createTechnician = async (req, res) => {
  try {
    const technician = await technicianService.createTechnician(req.body, req.user.userId);
    res.status(201).json({ message: 'Técnico creado', technician });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTechnicians = async (req, res) => {
  try {
    const technicians = await technicianService.getTechnicians(req.query);
    res.json(technicians);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTechnician = async (req, res) => {
  try {
    const technician = await technicianService.getTechnicianById(req.params.id);
    res.json(technician);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const updateTechnician = async (req, res) => {
  try {
    const technician = await technicianService.updateTechnician(req.params.id, req.body);
    res.json({ message: 'Técnico actualizado', technician });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteTechnician = async (req, res) => {
  try {
    const technician = await technicianService.deleteTechnician(req.params.id);
    res.json({ message: 'Técnico eliminado (soft delete)', technician });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

module.exports = {
  createTechnician,
  getTechnicians,
  getTechnician,
  updateTechnician,
  deleteTechnician,
};
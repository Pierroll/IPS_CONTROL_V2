// backend/src/controllers/planController.js
const planService = require('../services/planService');

const createPlan = async (req, res) => {
  try {
    const plan = await planService.createPlan(req.body, req.user.userId);
    res.status(201).json({ message: 'Plan creado', plan });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getPlans = async (req, res) => {
  try {
    const plans = await planService.getPlans(req.query);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPlan = async (req, res) => {
  try {
    const plan = await planService.getPlanById(req.params.id);
    res.json(plan);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const updatePlan = async (req, res) => {
  try {
    const plan = await planService.updatePlan(req.params.id, req.body);
    res.json({ message: 'Plan actualizado', plan });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deletePlan = async (req, res) => {
  try {
    const plan = await planService.deletePlan(req.params.id);
    res.json({ message: 'Plan eliminado (soft delete)', plan });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

module.exports = {
  createPlan,
  getPlans,
  getPlan,
  updatePlan,
  deletePlan,
};
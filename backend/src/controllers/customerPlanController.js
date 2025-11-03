const customerPlanService = require('../services/customerPlanService');

const createCustomerPlan = async (req, res) => {
  try {
    console.log('Recibiendo solicitud para /api/customer-plans:', JSON.stringify(req.body, null, 2));
    const customerPlan = await customerPlanService.createCustomerPlan(req.body, req.user?.userId);
    res.status(201).json({ message: 'Asignación de plan creada', customerPlan });
  } catch (error) {
    console.error('Error en createCustomerPlan:', {
      message: error.message,
      stack: error.stack,
      body: JSON.stringify(req.body, null, 2),
    });
    res.status(400).json({ error: error.message || 'Datos de la solicitud inválidos' });
  }
};

const getCustomerPlans = async (req, res) => {
  try {
    const customerPlans = await customerPlanService.getCustomerPlans(req.query);
    res.json(customerPlans);
  } catch (error) {
    console.error('Error en getCustomerPlans:', { message: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
};

const getCustomerPlanById = async (req, res) => {
  try {
    const customerPlan = await customerPlanService.getCustomerPlanById(req.params.id);
    res.json(customerPlan);
  } catch (error) {
    console.error('Error en getCustomerPlanById:', { message: error.message, stack: error.stack });
    res.status(404).json({ error: error.message });
  }
};
// backend/src/controllers/customerPlanController.js
const updateCustomerPlan = async (req, res) => {
  try {
    console.log('Recibiendo solicitud para PUT /api/customer-plans:', {
      id: req.params.id,
      body: JSON.stringify(req.body, null, 2),
    });
    const customerPlan = await customerPlanService.updateCustomerPlan(req.params.id, req.body, req.user?.userId);
    res.json({ message: 'Asignación de plan actualizada', customerPlan });
  } catch (error) {
    console.error('Error en updateCustomerPlan:', {
      message: error.message,
      details: error.details ? JSON.stringify(error.details, null, 2) : null,
      stack: error.stack,
      id: req.params.id,
      body: JSON.stringify(req.body, null, 2),
    });
    const statusCode = error.status || (error.message.includes('no encontrada') || error.message.includes('no encontrado') ? 404 : 400);
    res.status(statusCode).json({
      error: error.message || 'Error en la solicitud',
      details: error.details ? error.details.map(detail => detail.message) : null,
    });
  }
};

const deleteCustomerPlan = async (req, res) => {
  try {
    const customerPlan = await customerPlanService.deleteCustomerPlan(req.params.id);
    res.json({ message: 'Asignación de plan desactivada', customerPlan });
  } catch (error) {
    console.error('Error en deleteCustomerPlan:', { message: error.message, stack: error.stack });
    res.status(404).json({ error: error.message });
  }
};

module.exports = {
  createCustomerPlan,
  getCustomerPlans,
  getCustomerPlanById,
  updateCustomerPlan,
  deleteCustomerPlan,
};

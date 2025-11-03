const customerService = require('../services/customerService');

const createCustomer = async (req, res) => {
  try {
    const { routerId, planId, pppoeUsername, pppoePassword } = req.body;
    const customer = await customerService.createCustomer(req.body, req.user.userId, routerId, planId, pppoeUsername, pppoePassword);
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await customerService.getCustomers(req.query);
    res.json(customers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCustomer = async (req, res) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.json(customer);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// backend/src/controllers/customerController.js
const updateCustomer = async (req, res) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    res.json({
      message: 'Cliente actualizado', // Agregar mensaje
      customer // Envolver el resultado en un objeto customer
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await customerService.deleteCustomer(req.params.id);
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCustomersWithDetails = async (req, res) => {
  try {
    const customers = await customerService.getCustomersWithDetails(req.query);
    res.json(customers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomersWithDetails,
};
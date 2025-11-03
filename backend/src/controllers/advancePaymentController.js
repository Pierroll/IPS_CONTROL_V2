const advancePaymentService = require('../services/advancePaymentService');

// Crear pago adelantado
const createAdvancePayment = async (req, res) => {
  try {
    const userData = req.user;
    if (!userData || !userData.userId) {
      return res.status(401).json({ error: 'Usuario no autenticado correctamente' });
    }
    
    const data = {
      ...req.body,
      createdBy: userData.userId
    };

    const result = await advancePaymentService.createAdvancePayment(data);
    
    res.status(201).json({
      message: 'Pago adelantado creado exitosamente',
      advancePayment: result.advancePayment,
      monthlyPayments: result.monthlyPayments
    });
  } catch (error) {
    console.error('Error en createAdvancePayment:', error);
    res.status(400).json({ error: error.message });
  }
};

// Obtener pagos adelantados de un cliente
const getAdvancePaymentsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const advancePayments = await advancePaymentService.getAdvancePaymentsByCustomer(customerId);
    
    res.json(advancePayments);
  } catch (error) {
    console.error('Error en getAdvancePaymentsByCustomer:', error);
    res.status(400).json({ error: error.message });
  }
};

// Obtener todos los pagos adelantados
const getAllAdvancePayments = async (req, res) => {
  try {
    const filters = req.query;
    const advancePayments = await advancePaymentService.getAllAdvancePayments(filters);
    
    res.json(advancePayments);
  } catch (error) {
    console.error('Error en getAllAdvancePayments:', error);
    res.status(400).json({ error: error.message });
  }
};

// Eliminar pago adelantado
const deleteAdvancePayment = async (req, res) => {
  try {
    const { advancePaymentId } = req.params;
    const result = await advancePaymentService.deleteAdvancePayment({ advancePaymentId });
    
    res.json({
      message: 'Pago adelantado eliminado exitosamente',
      advancePayment: result
    });
  } catch (error) {
    console.error('Error en deleteAdvancePayment:', error);
    res.status(400).json({ error: error.message });
  }
};

// Aplicar pagos adelantados a facturas pendientes
const applyToPendingInvoices = async (req, res) => {
  try {
    const result = await advancePaymentService.applyToPendingInvoices();
    res.json({ 
      message: 'Pagos adelantados aplicados exitosamente', 
      appliedCount: result.appliedCount,
      totalInvoices: result.totalInvoices
    });
  } catch (error) {
    console.error('Error en applyToPendingInvoices:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createAdvancePayment,
  getAdvancePaymentsByCustomer,
  getAllAdvancePayments,
  deleteAdvancePayment,
  applyToPendingInvoices
};

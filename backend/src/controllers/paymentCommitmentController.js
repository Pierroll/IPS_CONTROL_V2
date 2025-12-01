// backend/src/controllers/paymentCommitmentController.js
const paymentCommitmentService = require('../services/paymentCommitmentService');

const createOrUpdateCommitment = async (req, res) => {
  try {
    const { customerId, commitmentDate, notes } = req.body;
    const createdBy = req.user.userId;

    if (!customerId || !commitmentDate) {
      return res.status(400).json({ 
        error: 'customerId y commitmentDate son requeridos' 
      });
    }

    const billingAccount = await paymentCommitmentService.createOrUpdatePaymentCommitment(
      customerId,
      commitmentDate,
      notes,
      createdBy
    );

    res.status(200).json({
      message: 'Compromiso de pago creado/actualizado exitosamente',
      billingAccount
    });
  } catch (error) {
    console.error('Error en createOrUpdateCommitment:', error);
    res.status(400).json({ error: error.message });
  }
};

const removeCommitment = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId es requerido' });
    }

    const billingAccount = await paymentCommitmentService.removePaymentCommitment(customerId);

    res.status(200).json({
      message: 'Compromiso de pago eliminado exitosamente',
      billingAccount
    });
  } catch (error) {
    console.error('Error en removeCommitment:', error);
    res.status(400).json({ error: error.message });
  }
};

const getActiveCommitments = async (req, res) => {
  try {
    const { customerId, from, to } = req.query;
    
    const commitments = await paymentCommitmentService.getActivePaymentCommitments({
      customerId,
      from,
      to
    });

    res.status(200).json(commitments);
  } catch (error) {
    console.error('Error en getActiveCommitments:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createOrUpdateCommitment,
  removeCommitment,
  getActiveCommitments
};


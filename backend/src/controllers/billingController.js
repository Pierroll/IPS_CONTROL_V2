const billingService = require('../services/billingService');
const { generateInvoicePdf } = require('../services/invoicePdfService');
const path = require('path');

const createInvoice = async (req, res) => {
  try {
    const invoice = await billingService.createInvoice(req.body, req.user.userId);
    res.status(201).json(invoice);
  } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };


const listInvoices = async (req, res) => {
  try {
    const invoices = await billingService.listInvoices(req.query);
    res.json(invoices);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoice = await billingService.getInvoiceById(req.params.id);
    res.json(invoice);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const recordPayment = async (req, res) => {
  try {
    console.log("📥 Body recibido en recordPayment:", req.body);
    const payment = await billingService.recordPayment(req.body, req.user.userId);
    
    // Construir mensaje según si se envió WhatsApp o no
    let message = 'Pago registrado exitosamente';
    if (payment.whatsappSent === false) {
      message = 'Pago registrado exitosamente, pero no se pudo enviar el mensaje de WhatsApp al cliente';
    }
    
    res.status(201).json({ 
      message: message,
      payment: payment,
      whatsappSent: payment.whatsappSent !== undefined ? payment.whatsappSent : true,
      whatsappError: payment.whatsappError || null
    });
  } catch (error) {
  console.error("❌ Error completo en recordPayment:", error);
  res.status(400).json({ error: error.message || 'Error desconocido al registrar el pago' });
  }
};

async function listPayments(req, res) {
  try {
    const payments = await billingService.listPayments(req.query);
    res.json(payments);
  } catch (error) {
    console.error('Error en listPayments:', error);
    res.status(400).json({ error: error.message });
  }
} ;// <- Aquí estaba faltando esta llave de cierre


const getBillingAccount = async (req, res) => {
  try {
    const account = await billingService.getBillingAccount(req.params.customerId);
    res.json(account);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const updateBillingAccount = async (req, res) => {
  try {
    const account = await billingService.updateBillingAccount(req.params.customerId, req.body);
    res.json(account);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const listBillingAccounts = async (req, res) => {
  try {
    const accounts = await billingService.listBillingAccounts(req.query);
    res.json(accounts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const downloadInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { filePath, fileName } = await generateInvoicePdf(id);
    res.download(filePath, fileName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const generateMonthlyDebt = async (req, res) => {
  try {
    console.log("🔄 Generando deudas mensuales manualmente...");
    const result = await billingService.generateMonthlyDebt();
    res.json({
      message: 'Deudas mensuales generadas exitosamente',
      result: result
    });
  } catch (error) {
    console.error("❌ Error generando deudas mensuales:", error);
    res.status(500).json({ error: error.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    console.log('🗑️ Controller deletePayment - paymentId:', req.params.paymentId);
    console.log('🗑️ Controller deletePayment - user:', req.user);
    
    const { paymentId } = req.params;
    const result = await billingService.deletePayment(paymentId);
    console.log('✅ Controller deletePayment - success:', result.id);
    res.json({ message: 'Pago eliminado exitosamente', payment: result });
  } catch (error) {
    console.error('❌ Error en deletePayment:', error);
    res.status(400).json({ error: error.message });
  }
};

const voidPayment = async (req, res) => {
  try {
    console.log('🚫 Controller voidPayment - paymentId:', req.params.paymentId);
    console.log('🚫 Controller voidPayment - user:', req.user);
    
    const { paymentId } = req.params;
    const { reason } = req.body;
    
    const result = await billingService.voidPayment(paymentId, reason);
    console.log('✅ Controller voidPayment - success:', result.id);
    res.json({ message: 'Pago anulado exitosamente', payment: result });
  } catch (error) {
    console.error('❌ Error en voidPayment:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createInvoice,
  listInvoices,
  getInvoiceById,
  recordPayment,
  listPayments,
  getBillingAccount,
  updateBillingAccount,
  listBillingAccounts,
  downloadInvoicePdf,
  generateMonthlyDebt,
  deletePayment,
  voidPayment
};
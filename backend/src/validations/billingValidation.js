const Joi = require('joi');

const createInvoiceSchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  periodStart: Joi.date().iso().required(),
  periodEnd: Joi.date().iso().required(),
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      unitPrice: Joi.number().positive().required(),
      planId: Joi.string().uuid().optional(),
      ticketId: Joi.string().uuid().optional(),
    })
  ).min(1).required(),
  tax: Joi.number().min(0).default(0),
  discount: Joi.number().min(0).default(0),
  notes: Joi.string().optional().allow(''),
  currency: Joi.string().default('PEN'),
});

const recordPaymentSchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  invoiceId: Joi.string().uuid().optional(),
  amount: Joi.number().positive().required(), // Mantener positive, el frontend ya valida > 0
  discount: Joi.number().min(0).default(0), // Descuento opcional, mínimo 0
  paymentMethod: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'DIGITAL_WALLET').required(),
  walletProvider: Joi.string().optional().allow(''), // Añadido
  reference: Joi.string().optional().allow(''),
  paymentDate: Joi.date().iso().required(),
  notes: Joi.string().optional().allow(''),
  createdBy: Joi.string().uuid().required(), // Añadido
}).custom((value, helpers) => {
  // Validar que el descuento no sea mayor que el monto
  if (value.discount && value.discount > value.amount) {
    return helpers.error('any.invalid', { message: 'El descuento no puede ser mayor que el monto a pagar' });
  }
  return value;
});

const updateBillingAccountSchema = Joi.object({
  creditLimit: Joi.number().positive().optional(),
  status: Joi.string().valid('ACTIVE', 'SUSPENDED', 'CANCELLED').optional(),
  billingCycle: Joi.number().integer().positive().optional(),
  autoSuspend: Joi.boolean().optional(),
});

const listInvoicesSchema = Joi.object({
  customerId: Joi.string().uuid().optional(),
  status: Joi.string().valid('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID').optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  q: Joi.string().optional().allow(''),
});

const listPaymentsSchema = Joi.object({
  customerId: Joi.string().uuid().optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  method: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'DIGITAL_WALLET').optional(),
});

const listBillingAccountsSchema = Joi.object({
  status: Joi.string().valid('pending', 'up-to-date', 'all').optional(),
});

module.exports = {
  createInvoiceSchema,
  recordPaymentSchema,
  updateBillingAccountSchema,
  listInvoicesSchema,
  listPaymentsSchema,
  listBillingAccountsSchema,
};
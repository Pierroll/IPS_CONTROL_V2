const Joi = require('joi');

const createCustomerPlanSchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  planId: Joi.string().uuid().required(),
  startDate: Joi.string().isoDate().required(), // Validar como cadena ISO
  endDate: Joi.string().isoDate().optional().allow(null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CANCELLED').default('ACTIVE'),
  changeType: Joi.string().valid('NEW', 'UPGRADE', 'DOWNGRADE', 'LATERAL', 'SUSPENSION', 'REACTIVATION').optional().allow(null),
  changeReason: Joi.string().max(500).optional().allow(null),
  notes: Joi.string().max(500).optional().allow(null),
  changedBy: Joi.string().optional(),
});

const updateCustomerPlanSchema = Joi.object({
  planId: Joi.string().uuid().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CANCELLED').optional(),
  startDate: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().isoDate()
  ).optional(),
  endDate: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().isoDate(),
    Joi.allow(null)
  ).optional(),
  changeType: Joi.string().valid('NEW', 'UPGRADE', 'DOWNGRADE', 'LATERAL', 'SUSPENSION', 'REACTIVATION').allow(null).optional(),
  changeReason: Joi.string().max(500).allow(null, '').optional(),
  notes: Joi.string().max(500).allow(null, '').optional(),
  changedBy: Joi.string().uuid().optional(),
}).min(1); // Requiere al menos un campo

module.exports = {
  createCustomerPlanSchema,
  updateCustomerPlanSchema,
};

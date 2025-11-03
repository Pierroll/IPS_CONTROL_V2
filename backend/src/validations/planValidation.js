// backend/src/validations/planValidation.js
const Joi = require('joi');

/* ============================= */
/*        PLANES                 */
/* ============================= */

const createPlanSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).optional().allow(null),
  category: Joi.string()
    .valid('INTERNET', 'TELEVISION', 'TELEPHONE', 'BUNDLE')
    .default('INTERNET'),
  subcategory: Joi.string().valid('ANTENA', 'FIBRA_OPTICA').optional().allow(null),
  downloadSpeed: Joi.number().precision(2).positive().optional().allow(null),
  uploadSpeed: Joi.number().precision(2).positive().optional().allow(null),
  dataLimit: Joi.number().integer().positive().optional().allow(null),
  monthlyPrice: Joi.number().precision(2).positive().required(),
  setupFee: Joi.number().precision(2).positive().optional().allow(null),
  active: Joi.boolean().default(true),
  isPromotional: Joi.boolean().default(false),
  slaLevel: Joi.string()
    .valid('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE')
    .default('STANDARD'),
  supportHours: Joi.string().max(50).optional().allow(null),
  features: Joi.array().items(Joi.string()).optional().default([]),
  restrictions: Joi.array().items(Joi.string()).optional().default([]),
  targetAudience: Joi.array().items(Joi.string()).optional().default([]),
  mikrotikProfileName: Joi.string().max(100).optional().allow(null), // Add this line
});

const updatePlanSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(500).optional().allow(null),
  category: Joi.string().valid('INTERNET', 'TELEVISION', 'TELEPHONE', 'BUNDLE').optional(),
  subcategory: Joi.string().valid('ANTENA', 'FIBRA_OPTICA').optional().allow(null),
  downloadSpeed: Joi.number().precision(2).positive().optional().allow(null),
  uploadSpeed: Joi.number().precision(2).positive().optional().allow(null),
  dataLimit: Joi.number().integer().positive().optional().allow(null),
  monthlyPrice: Joi.number().precision(2).positive().optional(),
  setupFee: Joi.number().precision(2).positive().optional().allow(null),
  active: Joi.boolean().optional(),
  isPromotional: Joi.boolean().optional(),
  slaLevel: Joi.string().valid('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE').optional(),
  supportHours: Joi.string().max(50).optional().allow(null),
  features: Joi.array().items(Joi.string()).optional(),
  restrictions: Joi.array().items(Joi.string()).optional(),
  targetAudience: Joi.array().items(Joi.string()).optional(),
  mikrotikProfileName: Joi.string().max(100).optional().allow(null), // Add this line
});

module.exports = {
  createPlanSchema,
  updatePlanSchema,
};
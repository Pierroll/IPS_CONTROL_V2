const Joi = require('joi');

const createRouterSchema = Joi.object({
  name: Joi.string().min(3).required(),
  ipAddress: Joi.string().ip({ version: ['ipv4'] }).required(),
  apiPort: Joi.number().integer().min(1).max(65535).required(),
  username: Joi.string().required(),
  password: Joi.string().min(8).required(),
  useTls: Joi.boolean().default(false),
  location: Joi.string().allow(null, ''),
  district: Joi.string().min(3).required(),
  province: Joi.string().allow(null, '').default('Huánuco'),
  department: Joi.string().allow(null, '').default('Huánuco'),
  model: Joi.string().allow(null, ''),
  deviceType: Joi.string().valid('MIKROTIK_ROUTER').default('MIKROTIK_ROUTER'),
  // ✅ REMOVIDO: createdBy - se obtiene del token JWT en el controller
});

const updateRouterSchema = Joi.object({
  name: Joi.string().min(3),
  ipAddress: Joi.string().ip({ version: ['ipv4'] }),
  apiPort: Joi.number().integer().min(1).max(65535),
  username: Joi.string(),
  password: Joi.string().min(8),
  useTls: Joi.boolean(),
  location: Joi.string().allow(null, ''),
  district: Joi.string().min(3),
  province: Joi.string().allow(null, ''),
  department: Joi.string().allow(null, ''),
  model: Joi.string().allow(null, ''),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FAILED'),
});

module.exports = {
  createRouterSchema,
  updateRouterSchema,
};
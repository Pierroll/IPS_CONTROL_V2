const Joi = require('joi');

const createTechnicianSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  phone: Joi.string().pattern(/^\+?\d{7,15}$/).required(),
  email: Joi.string().email().optional().allow(null),
  documentNumber: Joi.string().min(8).max(20).optional().allow(null),
  userId: Joi.string().uuid().optional().allow(null), // Relación opcional con User
  specialties: Joi.object().optional().allow(null), // Json
  certifications: Joi.object().optional().allow(null), // Json
  experience: Joi.number().integer().min(0).optional().allow(null),
  hourlyRate: Joi.number().precision(2).min(0).optional().allow(null),
  workSchedule: Joi.object().optional().allow(null), // Json
  isExternal: Joi.boolean().default(true),
  active: Joi.boolean().default(true),
  district: Joi.string().min(3).max(50).required(),
  province: Joi.string().min(3).max(50).default('Huánuco'),
  department: Joi.string().min(3).max(50).default('Huánuco'),
});

const updateTechnicianSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  phone: Joi.string().pattern(/^\+?\d{7,15}$/).optional(),
  email: Joi.string().email().optional().allow(null),
  documentNumber: Joi.string().min(8).max(20).optional().allow(null),
  userId: Joi.string().uuid().optional().allow(null),
  specialties: Joi.object().optional().allow(null),
  certifications: Joi.object().optional().allow(null),
  experience: Joi.number().integer().min(0).optional().allow(null),
  hourlyRate: Joi.number().precision(2).min(0).optional().allow(null),
  workSchedule: Joi.object().optional().allow(null),
  isExternal: Joi.boolean().optional(),
  active: Joi.boolean().optional(),
  district: Joi.string().min(3).max(50).optional(),
  province: Joi.string().min(3).max(50).optional(),
  department: Joi.string().min(3).max(50).optional(),
});

module.exports = { createTechnicianSchema, updateTechnicianSchema };
// backend/src/validations/customerValidation.js
const Joi = require('joi');

const createCustomerSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  businessName: Joi.string().min(3).max(100).optional().allow(null),
  email: Joi.string().email().optional().allow(null),
  phone: Joi.string().pattern(/^\+?\d{7,15}$/).required(),
  alternativePhone: Joi.string().pattern(/^\+?\d{7,15}$/).optional().allow(null),
  address: Joi.string().min(5).max(200).required(), // Cambiado a required
  district: Joi.string().min(3).max(50).required(),
  province: Joi.string().min(3).max(50).optional().allow(null),
  department: Joi.string().min(3).max(50).optional().allow(null),
  documentNumber: Joi.string().length(8).pattern(/^\d+$/).optional().allow(null), // Validación para DNI
  documentType: Joi.string().valid('DNI', 'RUC', 'PASSPORT', 'CE').optional().allow(null),
  customerType: Joi.string().valid('INDIVIDUAL', 'BUSINESS', 'CORPORATION').default('INDIVIDUAL'),
  serviceType: Joi.string().min(3).max(50).optional().allow(null),
  contractDate: Joi.date().optional().allow(null),
  creditLimit: Joi.number().precision(2).optional().allow(null),
  notes: Joi.string().max(500).optional().allow(null), // Para referencia
  tags: Joi.array().items(Joi.string()).optional().default([]),
  priority: Joi.string().valid('BAJA', 'MEDIA', 'ALTA', 'CRITICA').default('MEDIA'),
  source: Joi.string().max(50).optional().allow(null),
  assignedSeller: Joi.string().uuid().optional().allow(null),
  // Campos para creación de usuario PPPoE
  routerId: Joi.string().uuid().optional().allow(null),
  planId: Joi.string().uuid().optional().allow(null),
  pppoeUsername: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_-]+$/).optional().allow(null),
  pppoePassword: Joi.string().min(6).max(50).optional().allow(null),
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  businessName: Joi.string().min(3).max(100).optional().allow(null),
  email: Joi.string().email().optional().allow(null),
  phone: Joi.string().pattern(/^\+?\d{7,15}$/).optional(),
  alternativePhone: Joi.string().pattern(/^\+?\d{7,15}$/).optional().allow(null),
  address: Joi.string().trim().min(5).max(200).optional().allow(null, '').empty(''),
  district: Joi.string().min(3).max(50).optional(),
  province: Joi.string().min(3).max(50).optional().allow(null),
  department: Joi.string().min(3).max(50).optional().allow(null),
  documentNumber: Joi.string().length(8).pattern(/^\d+$/).optional().allow(null), // Validación para DNI
  documentType: Joi.string().valid('DNI', 'RUC', 'PASSPORT', 'CE').optional().allow(null),
  customerType: Joi.string().valid('INDIVIDUAL', 'BUSINESS', 'CORPORATION').optional(),
  serviceType: Joi.string().min(3).max(50).optional().allow(null),
  contractDate: Joi.date().optional().allow(null),
  creditLimit: Joi.number().precision(2).optional().allow(null),
  notes: Joi.string().max(500).optional().allow(null), // Para referencia
  tags: Joi.array().items(Joi.string()).optional(),
  priority: Joi.string().valid('BAJA', 'MEDIA', 'ALTA', 'CRITICA').optional(),
  source: Joi.string().max(50).optional().allow(null),
  assignedSeller: Joi.string().uuid().optional().allow(null),
  technicianId: Joi.string().uuid().optional().allow(null),
});

module.exports = { createCustomerSchema, updateCustomerSchema };
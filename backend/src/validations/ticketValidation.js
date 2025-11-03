// src/validations/ticketValidation.js
const Joi = require('joi');

const createTicketSchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  assignedTechnician: Joi.string().uuid().optional().allow(null),
  title: Joi.string().min(5).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  category: Joi.string().valid('INSTALACION', 'SOPORTE_TECNICO', 'MANTENIMIENTO', 'RECLAMO', 'CONSULTA', 'SUSPENSION', 'REACTIVACION', 'CAMBIO_PLAN').required(),
  subcategory: Joi.string().min(3).max(50).optional().allow(null),
  priority: Joi.string().valid('BAJA', 'MEDIA', 'ALTA', 'CRITICA').default('MEDIA'),
  serviceAddress: Joi.string().min(5).max(200).optional().allow(null),
  serviceDistrict: Joi.string().min(3).max(50).required(), // Necesario para asignación de técnico
  gpsCoordinates: Joi.string().max(50).optional().allow(null),
  notes: Joi.string().max(500).optional().allow(null),
  internalNotes: Joi.string().max(500).optional().allow(null),
  clientNotes: Joi.string().max(500).optional().allow(null),
  tags: Joi.array().items(Joi.string()).optional().default([]),
  slaLevel: Joi.string().valid('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE').default('STANDARD'),
  dueDate: Joi.date().optional().allow(null),
  estimatedCost: Joi.number().precision(2).optional().allow(null),
  estimatedHours: Joi.number().precision(2).optional().allow(null),
});

const updateTicketSchema = Joi.object({
  title: Joi.string().min(5).max(100).optional(),
  description: Joi.string().min(10).max(1000).optional(),
  category: Joi.string().valid('INSTALACION', 'SOPORTE_TECNICO', 'MANTENIMIENTO', 'RECLAMO', 'CONSULTA', 'SUSPENSION', 'REACTIVACION', 'CAMBIO_PLAN').optional(),
  subcategory: Joi.string().min(3).max(50).optional().allow(null),
  priority: Joi.string().valid('BAJA', 'MEDIA', 'ALTA', 'CRITICA').optional(),
  status: Joi.string().valid('PENDIENTE', 'ASIGNADO', 'EN_PROGRESO', 'ESCALADO', 'EN_ESPERA', 'RESUELTO', 'CERRADO', 'CANCELADO').optional(),
  serviceAddress: Joi.string().min(5).max(200).optional().allow(null),
  serviceDistrict: Joi.string().min(3).max(50).optional(),
  gpsCoordinates: Joi.string().max(50).optional().allow(null),
  notes: Joi.string().max(500).optional().allow(null),
  internalNotes: Joi.string().max(500).optional().allow(null),
  clientNotes: Joi.string().max(500).optional().allow(null),
  tags: Joi.array().items(Joi.string()).optional(),
  slaLevel: Joi.string().valid('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE').optional(),
  dueDate: Joi.date().optional().allow(null),
  estimatedCost: Joi.number().precision(2).optional().allow(null),
  estimatedHours: Joi.number().precision(2).optional().allow(null),
  assignedTechnician: Joi.string().uuid().optional().allow(null),
  assignedTo: Joi.string().uuid().optional().allow(null),
});

module.exports = { createTicketSchema, updateTicketSchema };
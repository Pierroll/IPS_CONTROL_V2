
// ============================================
// 📁 backend/src/services/notificationService.js
// ACTUALIZACIÓN: Agregar filtros adicionales
// ============================================

const fs = require('fs');
const path = require('path');
const prisma = require('../models/prismaClient');
const { postJson } = require('../utils/httpClient');
const Joi = require('joi');

// Nueva API de WhatsApp (whatsapp-web.js) - puerto 3001 por defecto
const BASE = process.env.WHATSAPP_API_URL || 'http://localhost:3001';

// La nueva API no requiere API_KEY
console.log('✅ WhatsApp API URL configurado:', BASE);

const getNotificationsSchema = Joi.object({
  customerId: Joi.string().uuid().optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  status: Joi.string().valid('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ').optional(),
  channel: Joi.string().valid('SMS', 'WHATSAPP', 'EMAIL', 'PUSH', 'VOICE').optional(),
});

const sendPaymentReminderSchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  message: Joi.string().required(),
  invoiceId: Joi.string().uuid().optional(),
});

async function getCustomerPhone(customerId) {
  const c = await prisma.customer.findUnique({ 
    where: { id: customerId }, 
    select: { phone: true } 
  });
  
  if (!c?.phone) throw new Error('Cliente sin teléfono registrado');
  
  const cleaned = c.phone.replace(/[^\d]/g, '');
  if (cleaned.length === 9) return `51${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('51')) return cleaned;
  
  throw new Error('Número debe tener 9 dígitos (sin prefijo) o 11 con prefijo 51');
}

async function getNotifications({ customerId, from, to, status, channel }) {
  const { error } = getNotificationsSchema.validate({ 
    customerId, 
    from, 
    to, 
    status, 
    channel 
  });
  if (error) throw new Error(error.details[0].message);

  const where = {};
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (channel) where.channel = channel;
  
  if (from || to) {
    where.sentAt = {};
    if (from) where.sentAt.gte = new Date(from);
    if (to) where.sentAt.lte = new Date(to);
  }

  return prisma.messageLog.findMany({
    where,
    include: {
      customer: { select: { name: true, phone: true } },
      invoice: { select: { invoiceNumber: true, total: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function sendPaymentReminder(customerId, message, invoiceId) {
  const { error } = sendPaymentReminderSchema.validate({ 
    customerId, 
    message, 
    invoiceId 
  });
  if (error) throw new Error(error.details[0].message);

  const phone = await getCustomerPhone(customerId);
  const url = `${BASE}/api/send`;
  
  console.log(`📤 Enviando mensaje de recordatorio a ${phone}...`);
  
  try {
    // Nueva API no requiere API_KEY en el header
    await postJson(url, { 
      to: phone, 
      message: message 
    }, {
      'Content-Type': 'application/json'
    });

    // Registrar como SENT
    const notification = await prisma.messageLog.create({
      data: {
        customerId,
        invoiceId,
        channel: 'WHATSAPP',
        messageType: 'PAYMENT_REMINDER',
        content: message,
        status: 'SENT',
        sentAt: new Date(),
        phoneNumber: phone,
      },
      include: {
        customer: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    });

    console.log(`✅ Mensaje enviado y registrado (ID: ${notification.id})`);
    return notification;
  } catch (error) {
    // Registrar como FAILED
    console.error(`❌ Error al enviar a ${phone}:`, error.message);
    
    const notification = await prisma.messageLog.create({
      data: {
        customerId,
        invoiceId,
        channel: 'WHATSAPP',
        messageType: 'PAYMENT_REMINDER',
        content: message,
        status: 'FAILED',
        errorMessage: error.message,
        phoneNumber: phone,
      },
      include: {
        customer: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    });

    throw new Error(`Error al enviar notificación: ${error.message}`);
  }
}

async function sendWhatsAppWithDocument(customerId, message, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Archivo PDF no encontrado para enviar');
  }
  
  const phone = await getCustomerPhone(customerId);
  const url = `${BASE}/api/send-pdf`;
  
  console.log(`📤 Enviando PDF a ${phone}...`);
  console.log(`📄 Archivo: ${filePath}`);
  console.log(`💬 Mensaje: ${message}`);
  console.log(`🌐 URL de WhatsApp API: ${url}`);
  
  // Convertir ruta relativa a absoluta si es necesario
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, '../../', filePath);
  
  try {
    const response = await postJson(url, {
      to: phone,
      path: absolutePath,
      message: message,
    }, {
      'Content-Type': 'application/json'
    });
    
    console.log(`✅ PDF enviado correctamente`);
    return response;
  } catch (error) {
    console.error(`❌ Error en postJson a ${url}:`, error.message);
    console.error(`❌ Status code:`, error.status);
    console.error(`❌ Response body:`, error.responseBody || error.body);
    console.error(`❌ Error completo:`, error);
    
    // Mejorar el mensaje de error para el usuario
    let errorMessage = error.message;
    if (error.status === 500) {
      errorMessage = `Error del servidor de WhatsApp: ${error.body?.error || error.message}`;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'No se pudo conectar a la API de WhatsApp. Verifica que esté corriendo.';
    }
    
    throw new Error(errorMessage);
  }
}

module.exports = {
  getNotifications,
  sendPaymentReminder,
  sendWhatsAppWithDocument,
};

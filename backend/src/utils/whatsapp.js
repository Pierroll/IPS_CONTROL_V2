// src/utils/whatsapp.js
// Adaptado para usar la nueva API de WhatsApp (whatsapp-web.js)
const { postJson } = require('./httpClient');
const prisma = require('../models/prismaClient');

// Nueva API de WhatsApp (whatsapp-web.js) - puerto 3001 por defecto
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3001';
const API_URL = `${WHATSAPP_API_URL}/api/send`;

async function sendWhatsAppNotification(to, message) {
  console.log(`📤 [WhatsApp Utils] Enviando mensaje a ${to}...`);
  console.log(`🌐 URL: ${API_URL}`);
  
  try {
    // Nueva API no requiere API_KEY en el header
    const response = await postJson(API_URL, { 
      to, 
      message 
    }, {
      'Content-Type': 'application/json'
    });
    
    console.log(`✅ [WhatsApp Utils] Mensaje enviado exitosamente a ${to}`);
    
    // Registra en MessageLog
    await prisma.messageLog.create({
      data: {
        direction: 'OUTBOUND',
        channel: 'WHATSAPP',
        phoneNumber: to,
        messageType: 'SERVICE_NOTIFICATION',
        content: message,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
    
    return response;
  } catch (error) {
    console.error(`❌ [WhatsApp Utils] Error enviando WhatsApp a ${to}:`, error.message);
    
    // Registrar como FAILED
    await prisma.messageLog.create({
      data: {
        direction: 'OUTBOUND',
        channel: 'WHATSAPP',
        phoneNumber: to,
        messageType: 'SERVICE_NOTIFICATION',
        content: message,
        status: 'FAILED',
        errorMessage: error.message,
      },
    });
    
    // Re-lanzar el error para que el llamador pueda manejarlo
    throw error;
  }
}

module.exports = { sendWhatsAppNotification };
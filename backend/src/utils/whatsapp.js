// src/utils/whatsapp.js
const axios = require('axios');
const prisma = require('../models/prismaClient');

const API_URL = 'http://localhost:3005/api/send';
const API_KEY = '22c746590447e7311801c22c4d53736d569843ebf6da3cf8498354399fe2f2e2';

async function sendWhatsAppNotification(to, message) {
  try {
    const response = await axios.post(API_URL, { to, message }, { headers: { 'x-api-key': API_KEY } });
    
    // Registra en MessageLog
    await prisma.messageLog.create({
      data: {
        direction: 'OUTBOUND',
        channel: 'WHATSAPP',
        phoneNumber: to,
        messageType: 'SERVICE_NOTIFICATION',
        content: message,
        status: 'SENT',
      },
    });
  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    
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
  }
}

module.exports = { sendWhatsAppNotification };
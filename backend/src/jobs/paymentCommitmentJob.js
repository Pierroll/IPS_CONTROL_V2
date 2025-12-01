// backend/src/jobs/paymentCommitmentJob.js
const cron = require('node-cron');
const paymentCommitmentService = require('../services/paymentCommitmentService');

// Verificar compromisos de pago vencidos diariamente a las 6:00 AM
// Esto se ejecuta después del corte mensual (5:00 AM) para procesar compromisos que vencieron
cron.schedule('0 6 * * *', async () => {
  console.log('🤖 [PaymentCommitmentJob] Iniciando verificación de compromisos de pago vencidos...');
  
  try {
    const result = await paymentCommitmentService.processExpiredPaymentCommitments();
    console.log(`✅ [PaymentCommitmentJob] Proceso completado:`, result);
  } catch (error) {
    console.error('❌ [PaymentCommitmentJob] Error procesando compromisos vencidos:', error);
  }
});

console.log('🕒 Job de verificación de compromisos de pago programado (diario a las 6:00 AM).');


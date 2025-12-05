// backend/src/jobs/paymentJob.js
const cron = require('node-cron');
const dayjs = require('dayjs');
const prisma = require('../models/prismaClient');
const notificationService = require('../services/notificationService');

cron.schedule('0 0 * * *', async () => {
  const today = dayjs();
  if (today.date() === 26) { // 5 días antes del 1ero
    console.log('[PaymentJob] Enviando recordatorios de pago (día 26)...');
    try {
      const billingAccounts = await prisma.billingAccount.findMany({
        where: { balance: { gt: 0 }, status: 'ACTIVE' },
        include: { customer: true },
      });
      
      let sent = 0;
      let failed = 0;
      
      for (const account of billingAccounts) {
        try {
          await notificationService.sendPaymentReminder(
            account.customerId,
            `Recordatorio: Saldo pendiente S/ ${account.balance.toFixed(2)}. Pague antes del 1ero para evitar suspensión.`,
            null
          );
          sent++;
        } catch (err) {
          console.error(`[PaymentJob] Error enviando a ${account.customer?.name}:`, err.message);
          failed++;
        }
      }
      
      console.log(`[PaymentJob] Recordatorios enviados: ${sent} exitosos, ${failed} fallidos`);
    } catch (err) {
      console.error('[PaymentJob] Error en job de recordatorios:', err);
    }
  }
});

cron.schedule('0 0 1 * *', async () => {
  console.log('[PaymentJob] Procesando suspensiones automáticas (día 1)...');
  try {
    const billingAccounts = await prisma.billingAccount.findMany({
      where: { balance: { gt: 0 }, status: 'ACTIVE', autoSuspend: true },
      include: { customer: true },
    });
    
    let suspended = 0;
    let notified = 0;
    let failed = 0;
    
    for (const account of billingAccounts) {
      try {
        await prisma.billingAccount.update({
          where: { id: account.id },
          data: { status: 'SUSPENDED', suspendedAt: new Date() },
        });

        await prisma.customerPlan.updateMany({
          where: { customerId: account.customerId, status: 'ACTIVE' },
          data: { status: 'SUSPENDED' },
        });

        suspended++;
        
        try {
          await notificationService.sendPaymentReminder(
            account.customerId,
            `Servicio suspendido por saldo pendiente S/ ${account.balance.toFixed(2)}. Pague para reactivar.`,
            null
          );
          notified++;
        } catch (notifErr) {
          console.error(`[PaymentJob] Error notificando suspensión a ${account.customer?.name}:`, notifErr.message);
          failed++;
        }
      } catch (err) {
        console.error(`[PaymentJob] Error suspendiendo a ${account.customer?.name}:`, err.message);
        failed++;
      }
    }
    
    console.log(`[PaymentJob] Suspensiones: ${suspended} suspendidos, ${notified} notificados, ${failed} errores`);
  } catch (err) {
    console.error('[PaymentJob] Error en job de suspensiones:', err);
  }
});
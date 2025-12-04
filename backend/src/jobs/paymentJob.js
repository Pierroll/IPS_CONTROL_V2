// backend/src/jobs/paymentJob.js
const cron = require('node-cron');
const dayjs = require('dayjs');
const prisma = require('../models/prismaClient');
const notificationService = require('../services/notificationService');

cron.schedule('0 0 * * *', async () => {
  const today = dayjs();
  if (today.date() === 26) { // 5 días antes del 1ero
    const billingAccounts = await prisma.billingAccount.findMany({
      where: { balance: { gt: 0 }, status: 'ACTIVE' },
      include: { customer: true },
    });
    for (const account of billingAccounts) {
      await notificationService.sendPaymentReminder(
        account.customerId,
        `Recordatorio: Saldo pendiente S/ ${account.balance.toFixed(2)}. Pague antes del 1ero para evitar suspensión.`,
        null
      );
    }
  }
});

cron.schedule('0 0 1 * *', async () => {
  const billingAccounts = await prisma.billingAccount.findMany({
    where: { balance: { gt: 0 }, status: 'ACTIVE', autoSuspend: true },
    include: { customer: true },
  });
  for (const account of billingAccounts) {
    await prisma.billingAccount.update({
      where: { id: account.id },
      data: { status: 'SUSPENDED', suspendedAt: new Date() },
    });

    await prisma.customerPlan.updateMany({
      where: { customerId: account.customerId, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' },
    });

    await notificationService.sendPaymentReminder(
      account.customerId,
      `Servicio suspendido por saldo pendiente S/ ${account.balance.toFixed(2)}. Pague para reactivar.`,
      null
    );
  }
});
// backend/src/services/dunningService.js
const prisma = require('../models/prismaClient');
const dayjs = require('dayjs');
const { LIMA_TZ } = require('../utils/date');
const notificationService = require('./notificationService');

// Regla: overdue si dueDate < hoy
async function markOverdues() {
  const now = dayjs().tz(LIMA_TZ).toDate();
  const updated = await prisma.invoice.updateMany({
    where: {
      status: { in: ['PENDING', 'PARTIAL'] },
      dueDate: { lt: now },
    },
    data: { status: 'OVERDUE' },
  });
  return updated.count;
}

// Notificar 5 días antes del 1 del próximo mes a quienes tengan saldo > 0
async function notifyFiveDaysBefore() {
  const accounts = await prisma.billingAccount.findMany({
    where: { balance: { gt: 0 } },
    include: { customer: true },
  });

  for (const ba of accounts) {
    const msg = `Estimado(a) ${ba.customer?.name || 'cliente'}, tiene un saldo pendiente de S/ ${Number(
      ba.balance
    ).toFixed(2)}. Puede pagar por los canales habituales. Al registrar su pago, recibirá su comprobante por WhatsApp.`;
    try {
      await notificationService.sendPaymentReminder(ba.customerId, msg);
    } catch (e) {
      console.error('Error enviando recordatorio:', e.message);
    }
  }
  return accounts.length;
}

// Suspende cuentas con OVERDUE > X días (ej. 7) y autoSuspend=true
async function autoSuspendIfNeeded(days = 7) {
  const limit = dayjs().tz(LIMA_TZ).subtract(days, 'day').toDate();

  // Encuentra cuentas con facturas OVERDUE con dueDate < limit
  const overdueInvoices = await prisma.invoice.findMany({
    where: { status: 'OVERDUE', dueDate: { lt: limit } },
    select: { customerId: true },
    distinct: ['customerId'],
  });

  let count = 0;
  for (const inv of overdueInvoices) {
    const ba = await prisma.billingAccount.findUnique({ where: { customerId: inv.customerId } });
    if (!ba || !ba.autoSuspend || ba.status === 'SUSPENDED') continue;

    await prisma.billingAccount.update({
      where: { customerId: inv.customerId },
      data: { status: 'SUSPENDED', suspendedAt: new Date() },
    });

    // (Opcional) suspender plan activo
    await prisma.customerPlan.updateMany({
      where: { customerId: inv.customerId, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' },
    });

    try {
      await notificationService.sendPaymentReminder(
        inv.customerId,
        'Su servicio fue suspendido por deuda vencida. Regularice su pago para reactivación.'
      );
    } catch (e) {
      console.error('Error notificando suspensión:', e.message);
    }
    count++;
  }
  return count;
}

module.exports = { markOverdues, notifyFiveDaysBefore, autoSuspendIfNeeded };

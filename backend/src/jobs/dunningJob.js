// backend/src/jobs/dunningJob.js
const cron = require('node-cron');
const dayjs = require('dayjs');
const prisma = require('../models/prismaClient');
const notificationService = require('../services/notificationService');
const pppoeService = require('../services/pppoeService');

function daysToFirstOfNextMonth(now = dayjs()) {
  const firstNext = now.add(1, 'month').startOf('month');
  return firstNext.diff(now.startOf('day'), 'day');
}

// Tarea 1: Enviar recordatorios de pago 5 días antes del vencimiento.
cron.schedule('0 9 * * *', async () => {
  try {
    const today = dayjs();
    const daysLeft = daysToFirstOfNextMonth(today);
    if (daysLeft > 5) {
      console.log(`[DunningJob-Reminders] Faltan ${daysLeft} días para el fin de mes. No se envían recordatorios.`);
      return;
    }

    const customers = await prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        customerPlans: { some: { status: 'ACTIVE' } },
        billingAccount: { balance: { gt: 0 } }
      },
      select: {
        id: true,
        name: true,
        billingAccount: { select: { balance: true } },
        customerPlans: {
          where: { status: 'ACTIVE' },
          select: { plan: { select: { name: true, monthlyPrice: true } } },
          take: 1
        }
      }
    });

    if (customers.length === 0) {
      console.log('[DunningJob-Reminders] No hay clientes con deudas para enviar recordatorios.');
      return;
    }

    for (const c of customers) {
      const planName = c.customerPlans[0]?.plan?.name ?? 'tu servicio';
      const balance = Number(c.billingAccount?.balance || 0).toFixed(2);
      const msg = `Hola, ${c.name}. Recordatorio de pago: saldo S/ ${balance} por ${planName}. ` +
                  `Evita la suspensión pagando antes del día 1°. ¡Gracias!`;
      try {
        await notificationService.sendPaymentReminder(c.id, msg, null);
      } catch (err) {
        console.error(`[DunningJob-Reminders] Error enviando a ${c.name}:`, err.message);
      }
    }

    console.log(`[DunningJob-Reminders] Recordatorios enviados a ${customers.length} clientes (faltan ${daysLeft} días).`);
  } catch (err) {
    console.error('[DunningJob-Reminders] Error:', err);
  }
});

// Tarea 2: Suspensión de servicio por mora.
// Se ejecuta el día 1 de cada mes a las 5:00 AM.
cron.schedule('16 15 3 11 *', async () => {
  console.log('🤖 [DunningJob-Suspension] Iniciando job de suspensión por mora...');

  try {
    const cutProfile = process.env.MIKROTIK_CUT_PROFILE;
    if (!cutProfile) {
      console.error('❌ Error: La variable de entorno MIKROTIK_CUT_PROFILE no está definida.');
      return;
    }

    const delinquentAccounts = await prisma.billingAccount.findMany({
      where: {
        balance: {
          gt: 0, // Mayor que cero (deuda)
        },
        status: {
          not: 'SUSPENDED', // No procesar los que ya están suspendidos
        },
      },
      include: {
        customer: {
          include: {
            pppoeAccounts: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    if (delinquentAccounts.length === 0) {
      console.log('✅ [DunningJob-Suspension] No se encontraron clientes morosos para suspender.');
      return;
    }

    console.log(`🔍 [DunningJob-Suspension] Encontrados ${delinquentAccounts.length} clientes morosos. Procediendo a la suspensión...`);

    for (const account of delinquentAccounts) {
      const customer = account.customer;
      const pppoeAccount = await prisma.pppoeAccount.findFirst({
        where: {
          customerId: customer.id,
        },
      });

      if (pppoeAccount && pppoeAccount.username) {
        const username = pppoeAccount.username;
        console.log(`⏳ Suspendiendo a ${customer.name} (Usuario PPPoE: ${username})...`);

        try {
          await pppoeService.changeCustomerProfile(username, cutProfile);

          await prisma.billingAccount.update({
            where: { id: account.id },
            data: {
              status: 'SUSPENDED',
              suspendedAt: new Date(),
            },
          });

          console.log(`✅ Cliente ${customer.name} suspendido exitosamente.`);
        } catch (err) {
          console.error(`❌ Error al suspender al cliente ${customer.name} (Usuario: ${username}):`, err.message);
        }
      } else {
        console.warn(`⚠️  El cliente ${customer.name} (ID: ${customer.id}) es moroso pero no tiene una cuenta PPPoE para suspender.`);
      }
    }

    console.log('🎉 [DunningJob-Suspension] Job de suspensión por mora finalizado.');

  } catch (error) {
    console.error('❌ Error fatal durante el job de suspensión por mora:', error);
  }
});

console.log('🕒 Jobs de recordatorio y suspensión programados.');

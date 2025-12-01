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
      await notificationService.sendPaymentReminder(c.id, msg);
    }

    console.log(`[DunningJob-Reminders] Recordatorios enviados a ${customers.length} clientes (faltan ${daysLeft} días).`);
  } catch (err) {
    console.error('[DunningJob-Reminders] Error:', err);
  }
});

// Tarea 2: Suspensión de servicio por mora.
// Se ejecuta el día 1 de cada mes a las 5:00 AM.
cron.schedule('0 5 1 * *', async () => {
  console.log('🤖 [DunningJob-Suspension] Iniciando job de suspensión por mora...');

  try {
    const cutProfile = process.env.MIKROTIK_CUT_PROFILE || 'CORTE MOROSO';
    console.log(`📋 Usando perfil de corte: ${cutProfile}`);

    // Buscar clientes morosos con balance > 0 y autoSuspend = true
    // Nota: Si los campos paymentCommitmentDate no existen en la BD, ejecuta la migración primero
    const delinquentAccounts = await prisma.billingAccount.findMany({
      where: {
        balance: {
          gt: 0, // Mayor que cero (deuda)
        },
        status: {
          not: 'SUSPENDED', // No procesar los que ya están suspendidos
        },
        autoSuspend: true, // Solo los que tienen autoSuspend habilitado
        // Excluir clientes con compromisos de pago activos (fecha futura)
        OR: [
          { paymentCommitmentDate: null },
          { paymentCommitmentDate: { lt: new Date() } } // Solo si el compromiso ya venció
        ],
      },
      include: {
        customer: {
          include: {
            pppoeAccounts: {
              where: {
                active: true,
                deletedAt: null
              },
              include: {
                device: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
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

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const account of delinquentAccounts) {
      const customer = account.customer;
      
      if (!customer.pppoeAccounts || customer.pppoeAccounts.length === 0) {
        console.warn(`⚠️  El cliente ${customer.name} (ID: ${customer.id}) es moroso pero no tiene cuentas PPPoE activas para suspender.`);
        skippedCount++;
        continue;
      }

      // Procesar todas las cuentas PPPoE del cliente
      for (const pppoeAccount of customer.pppoeAccounts) {
        if (!pppoeAccount.username) {
          console.warn(`⚠️  Cuenta PPPoE sin username para cliente ${customer.name}`);
          continue;
        }

        const username = pppoeAccount.username;
        const routerName = pppoeAccount.device?.name || 'desconocido';
        console.log(`⏳ Suspendiendo a ${customer.name} (Usuario PPPoE: ${username}, Router: ${routerName})...`);

        try {
          // Cambiar perfil en Mikrotik
          await pppoeService.changeCustomerProfile(username, cutProfile);

          // Actualizar estado en BD
          await prisma.billingAccount.update({
            where: { id: account.id },
            data: {
              status: 'SUSPENDED',
              suspendedAt: new Date(),
            },
          });

          // Suspender planes activos
          await prisma.customerPlan.updateMany({
            where: { customerId: customer.id, status: 'ACTIVE' },
            data: { status: 'SUSPENDED' },
          });

          // Enviar notificación
          try {
            await notificationService.sendPaymentReminder(
              customer.id,
              `Servicio suspendido por saldo pendiente S/ ${Number(account.balance).toFixed(2)}. Pague para reactivar.`
            );
          } catch (notifError) {
            console.warn(`⚠️  Error enviando notificación a ${customer.name}:`, notifError.message);
          }

          console.log(`✅ Cliente ${customer.name} suspendido exitosamente.`);
          successCount++;
        } catch (err) {
          console.error(`❌ Error al suspender al cliente ${customer.name} (Usuario: ${username}):`, err.message);
          failedCount++;
        }
      }
    }

    console.log(`🎉 [DunningJob-Suspension] Job de suspensión por mora finalizado.`);
    console.log(`📊 Resumen: ${successCount} exitosos, ${failedCount} fallidos, ${skippedCount} omitidos`);

  } catch (error) {
    console.error('❌ Error fatal durante el job de suspensión por mora:', error);
  }
});

console.log('🕒 Jobs de recordatorio y suspensión programados.');

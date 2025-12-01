// backend/src/jobs/paymentJob.js
const cron = require('node-cron');
const dayjs = require('dayjs');
const prisma = require('../models/prismaClient');
const notificationService = require('../services/notificationService');
const pppoeService = require('../services/pppoeService');

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

// Corte automático el día 1 de cada mes a las 0:00 (complementa dunningJob que se ejecuta a las 5:00 AM)
// Este job procesa clientes que no fueron cortados por dunningJob (por ejemplo, si autoSuspend se activó después)
cron.schedule('0 0 1 * *', async () => {
  console.log('🔄 [PaymentJob-MonthlyCut] Iniciando corte mensual de clientes morosos...');
  
  try {
    const cutProfile = process.env.MIKROTIK_CUT_PROFILE || 'CORTE MOROSO';
    
    // Nota: Si los campos paymentCommitmentDate no existen en la BD, ejecuta la migración primero
    const billingAccounts = await prisma.billingAccount.findMany({
      where: { 
        balance: { gt: 0 }, 
        status: 'ACTIVE', 
        autoSuspend: true,
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
            }
          }
        }
      },
    });

    if (billingAccounts.length === 0) {
      console.log('✅ [PaymentJob-MonthlyCut] No hay clientes morosos para suspender.');
      return;
    }

    console.log(`🔍 [PaymentJob-MonthlyCut] Encontrados ${billingAccounts.length} clientes morosos. Procediendo a la suspensión...`);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const account of billingAccounts) {
      const customer = account.customer;
      
      if (!customer.pppoeAccounts || customer.pppoeAccounts.length === 0) {
        console.warn(`⚠️  Cliente ${customer.name} no tiene cuentas PPPoE activas`);
        skippedCount++;
        continue;
      }

      // Procesar todas las cuentas PPPoE del cliente
      for (const pppoeAccount of customer.pppoeAccounts) {
        if (!pppoeAccount.username) {
          continue;
        }

        try {
          console.log(`⏳ [PaymentJob-MonthlyCut] Suspendiendo a ${customer.name} (Usuario: ${pppoeAccount.username})...`);
          
          // Cambiar perfil en Mikrotik
          await pppoeService.changeCustomerProfile(pppoeAccount.username, cutProfile);

          // Actualizar estado en BD
          await prisma.billingAccount.update({
            where: { id: account.id },
            data: { status: 'SUSPENDED', suspendedAt: new Date() },
          });

          // Suspender planes activos
          await prisma.customerPlan.updateMany({
            where: { customerId: account.customerId, status: 'ACTIVE' },
            data: { status: 'SUSPENDED' },
          });

          // Enviar notificación
          try {
            await notificationService.sendPaymentReminder(
              account.customerId,
              `Servicio suspendido por saldo pendiente S/ ${Number(account.balance).toFixed(2)}. Pague para reactivar.`
            );
          } catch (notifError) {
            console.warn(`⚠️  Error enviando notificación:`, notifError.message);
          }

          console.log(`✅ [PaymentJob-MonthlyCut] Cliente ${customer.name} suspendido exitosamente.`);
          successCount++;
        } catch (err) {
          console.error(`❌ [PaymentJob-MonthlyCut] Error al suspender a ${customer.name}:`, err.message);
          failedCount++;
        }
      }
    }

    console.log(`🎉 [PaymentJob-MonthlyCut] Proceso completado. ${successCount} exitosos, ${failedCount} fallidos, ${skippedCount} omitidos`);
  } catch (error) {
    console.error('❌ [PaymentJob-MonthlyCut] Error en corte mensual:', error);
  }
});
const cron = require('node-cron');
const dayjs = require('dayjs');
const prisma = require('../models/prismaClient');
const billingService = require('../services/billingService');
const advancePaymentService = require('../services/advancePaymentService');
const pppoeService = require('../services/pppoeService');
const notificationService = require('../services/notificationService');

// Generar deuda el 25 de cada mes
cron.schedule('0 0 25 * *', async () => {
  console.log('🔄 Iniciando generación de deuda mensual');
  try {
    // Generar deudas mensuales
    await billingService.generateMonthlyDebt();
    
    // Aplicar pagos adelantados automáticamente
    console.log('🔄 Aplicando pagos adelantados automáticamente');
    await applyAdvancePayments();
  } catch (error) {
    console.error('❌ Error generando deuda:', error);
  }
});

// Función para aplicar pagos adelantados automáticamente
async function applyAdvancePayments() {
  try {
    const currentDate = dayjs();
    const currentMonth = currentDate.month() + 1; // dayjs usa 0-11, necesitamos 1-12
    const currentYear = currentDate.year();

    console.log(`📅 Aplicando pagos adelantados para ${currentMonth}/${currentYear}`);

    // Buscar todas las facturas del mes actual que están pendientes
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PENDING',
        periodStart: {
          gte: new Date(currentYear, currentMonth - 1, 1), // Primer día del mes
          lt: new Date(currentYear, currentMonth, 1) // Primer día del siguiente mes
        }
      },
      include: {
        customer: true
      }
    });

    console.log(`📋 Encontradas ${pendingInvoices.length} facturas pendientes para aplicar pagos adelantados`);

    let appliedCount = 0;
    for (const invoice of pendingInvoices) {
      try {
        const result = await advancePaymentService.applyAdvancePaymentToInvoice(
          invoice.customerId,
          invoice.id,
          currentMonth,
          currentYear
        );

        if (result) {
          appliedCount++;
          console.log(`✅ Pago adelantado aplicado para cliente ${invoice.customerId} - Factura ${invoice.invoiceNumber}`);
        }
      } catch (error) {
        console.error(`❌ Error aplicando pago adelantado para cliente ${invoice.customerId}:`, error.message);
      }
    }

    console.log(`🎉 Aplicación de pagos adelantados completada: ${appliedCount} pagos aplicados`);
  } catch (error) {
    console.error('❌ Error en aplicación automática de pagos adelantados:', error);
  }
}

// Verificar cortes diarios a medianoche (para clientes con facturas OVERDUE)
// Este job complementa el corte mensual del día 1, procesando clientes que se vuelven morosos durante el mes
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 [BillingJob-DailyCut] Verificando cuentas para suspensión diaria');
  try {
    const cutProfile = process.env.MIKROTIK_CUT_PROFILE || 'CORTE MOROSO';
    
    // Nota: Si los campos paymentCommitmentDate no existen en la BD, ejecuta la migración primero
    const overdue = await prisma.billingAccount.findMany({
      where: {
        status: 'ACTIVE',
        balance: { gt: 0 },
        autoSuspend: true,
        invoices: {
          some: {
            status: 'OVERDUE',
            dueDate: { lt: new Date() }
          }
        },
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
      }
    });

    if (overdue.length === 0) {
      console.log('✅ [BillingJob-DailyCut] No hay clientes morosos para suspender hoy.');
      return;
    }

    console.log(`🔍 [BillingJob-DailyCut] Encontrados ${overdue.length} clientes morosos. Procediendo a la suspensión...`);

    let successCount = 0;
    let failedCount = 0;

    for (const account of overdue) {
      const customer = account.customer;
      
      if (!customer.pppoeAccounts || customer.pppoeAccounts.length === 0) {
        console.warn(`⚠️  Cliente ${customer.name} no tiene cuentas PPPoE activas`);
        continue;
      }

      // Procesar todas las cuentas PPPoE del cliente
      for (const pppoeAccount of customer.pppoeAccounts) {
        if (!pppoeAccount.username) {
          continue;
        }

        try {
          console.log(`⏳ [BillingJob-DailyCut] Suspendiendo a ${customer.name} (Usuario: ${pppoeAccount.username})...`);
          
          // Cambiar perfil en Mikrotik
          await pppoeService.changeCustomerProfile(pppoeAccount.username, cutProfile);

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
              `Servicio suspendido por factura vencida. Saldo pendiente: S/ ${Number(account.balance).toFixed(2)}. Pague para reactivar.`
            );
          } catch (notifError) {
            console.warn(`⚠️  Error enviando notificación:`, notifError.message);
          }

          console.log(`✅ [BillingJob-DailyCut] Cliente ${customer.name} suspendido exitosamente.`);
          successCount++;
        } catch (err) {
          console.error(`❌ [BillingJob-DailyCut] Error al suspender a ${customer.name}:`, err.message);
          failedCount++;
        }
      }
    }

    console.log(`🎉 [BillingJob-DailyCut] Proceso completado. ${successCount} exitosos, ${failedCount} fallidos`);
  } catch (error) {
    console.error('❌ [BillingJob-DailyCut] Error procesando suspensiones:', error);
  }
});
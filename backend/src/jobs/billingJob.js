const cron = require('node-cron');
const dayjs = require('dayjs');
const prisma = require('../models/prismaClient');
const billingService = require('../services/billingService');
const advancePaymentService = require('../services/advancePaymentService');
// const networkService = require('../services/networkDeviceService'); // TODO: Implementar este servicio

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

// Verificar cortes a medianoche
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Verificando cuentas para suspensión');
  try {
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
        }
      },
      include: {
        customer: {
          include: {
            pppoeAccounts: {
              where: { active: true }
            }
          }
        }
      }
    });

    for (const account of overdue) {
      // TODO: Implementar suspensión de clientes
      console.log(`⚠️ Cliente ${account.customerId} debería ser suspendido`);
      // await networkService.suspendCustomer(account.customerId);
    }
  } catch (error) {
    console.error('❌ Error procesando suspensiones:', error);
  }
});
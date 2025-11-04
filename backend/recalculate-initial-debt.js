const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function recalculateInitialDebt() {
  console.log('🔄 Iniciando recálculo de deudas iniciales para clientes importados...');

  try {
    // 1. Encontrar todos los clientes marcados como importados
    const importedCustomers = await prisma.customer.findMany({
      where: {
        customerPlans: {
          some: {
            notes: 'Importado desde Excel',
          },
        },
      },
      include: {
        billingAccount: true,
        customerPlans: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
        },
      },
    });

    if (importedCustomers.length === 0) {
      console.log('✅ No se encontraron clientes importados para procesar.');
      return;
    }

    console.log(`🔍 Encontrados ${importedCustomers.length} clientes para recalcular.`);
    let successCount = 0;

    // 2. Iterar y corregir cada cliente
    for (const customer of importedCustomers) {
      const activePlan = customer.customerPlans[0];
      const billingAccount = customer.billingAccount;

      if (!activePlan || !billingAccount) {
        console.warn(`⚠️ Saltando cliente ${customer.name}: no tiene plan activo o cuenta de cobro.`);
        continue;
      }

      const fullMonthlyPrice = activePlan.plan.monthlyPrice;
      const currentIncorrectBalance = billingAccount.balance;

      if (Number(currentIncorrectBalance) === Number(fullMonthlyPrice)) {
        console.log(`✅ Cliente ${customer.name} ya tiene el saldo correcto. Saltando...`);
        successCount++;
        continue;
      }

      console.log(`⏳ Corrigiendo deuda para ${customer.name}...`);

      // Buscar el recibo y asiento contable originales para corregirlos también
      const initialReceipt = await prisma.internalReceipt.findFirst({
        where: { customerId: customer.id, description: { contains: 'Alta de' } },
        orderBy: { createdAt: 'desc' },
      });

      const initialLedgerEntry = await prisma.ledgerEntry.findFirst({
        where: { billingAccountId: billingAccount.id, type: 'DEBIT', description: { contains: 'Factura' } },
        orderBy: { transactionDate: 'desc' },
      });

      await prisma.$transaction(async (tx) => {
        // Actualizar la cuenta de cobro al monto mensual completo
        await tx.billingAccount.update({
          where: { id: billingAccount.id },
          data: { balance: fullMonthlyPrice },
        });

        // Corregir el monto en el recibo interno si se encuentra
        if (initialReceipt) {
          await tx.internalReceipt.update({
            where: { id: initialReceipt.id },
            data: { amount: fullMonthlyPrice },
          });
        }

        // Corregir el monto en el asiento contable si se encuentra
        if (initialLedgerEntry) {
          await tx.ledgerEntry.update({
            where: { id: initialLedgerEntry.id },
            data: { amount: fullMonthlyPrice },
          });
        }
      });

      console.log(`✅ Deuda de ${customer.name} corregida de S/${currentIncorrectBalance} a S/${fullMonthlyPrice}.`);
      successCount++;
    }

    console.log(`\n🎉 Proceso finalizado. ${successCount} de ${importedCustomers.length} clientes actualizados.`);

  } catch (error) {
    console.error('❌ Error fatal durante el recálculo de deudas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateInitialDebt();

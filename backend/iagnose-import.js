const XLSX = require('xlsx');
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function diagnoseImport() {
  console.log('🕵️  INICIANDO DIAGNÓSTICO DE IMPORTACIÓN...');

  try {
    const workbook = XLSX.readFile('./clientes_upload.xlsx');
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    console.log(`📋 Encontrados ${rows.length - 1} registros en el Excel para verificar.`);

    let missingPlanAssignment = [];
    let wrongBalance = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const customerName = row[2];
      const pppoeUsername = row[5];

      if (!customerName || !pppoeUsername) continue;

      const customer = await prisma.customer.findFirst({
        where: { pppoeAccounts: { some: { username: pppoeUsername } } },
        include: {
          billingAccount: true,
          customerPlans: { include: { plan: true } },
        },
      });

      if (!customer) {
        console.log(`- [NO ENCONTRADO] Cliente con usuario PPPoE "${pppoeUsername}" no existe en la BD.`);
        continue;
      }

      const activePlan = customer.customerPlans.find(p => p.status === 'ACTIVE');
      if (!activePlan) {
        missingPlanAssignment.push(customer.name);
        console.log(`- [SIN PLAN] Cliente: ${customer.name} (ID: ${customer.id}) existe, pero no tiene un plan activo asignado.`);
        continue;
      }

      const fullMonthlyPrice = Number(activePlan.plan.monthlyPrice);
      const currentBalance = Number(customer.billingAccount?.balance || 0);

      if (currentBalance.toFixed(2) !== fullMonthlyPrice.toFixed(2)) {
        wrongBalance.push({ name: customer.name, current: currentBalance, expected: fullMonthlyPrice });
        console.log(`- [SALDO INCORRECTO] Cliente: ${customer.name} | Saldo Actual: ${currentBalance.toFixed(2)} | Saldo Esperado: ${fullMonthlyPrice.toFixed(2)}`);
      }
    }

    console.log('\n--- 🕵️  RESUMEN DEL DIAGNÓSTICO ---');
    if (missingPlanAssignment.length > 0) {
      console.log(`\n❌ Clientes a los que les falta la asignación de plan (${missingPlanAssignment.length}):`);
      console.log(missingPlanAssignment.join(', '));
    } else {
      console.log('\n✅ Todos los clientes importados tienen un plan asignado.');
    }

    if (wrongBalance.length > 0) {
      console.log(`\n❌ Clientes con saldo inicial incorrecto (${wrongBalance.length}):`);
      wrongBalance.forEach(c => console.log(`  - ${c.name}: Tiene S/${c.current.toFixed(2)}, debería tener S/${c.expected.toFixed(2)}`));
    } else {
      console.log('\n✅ Todos los clientes con plan asignado tienen el saldo correcto.');
    }
    console.log('------------------------------------');

  } catch (error) {
    console.error('❌ Error fatal durante el diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseImport();

// /backend/import-test-customers.js (VERSIÓN FINAL CORREGIDA)

const XLSX = require('xlsx');
const { PrismaClient } = require('./src/generated/prisma');
const customerService = require('./src/services/customerService.js');
const customerPlanService = require('./src/services/customerPlanService.js');

const prisma = new PrismaClient();

async function importTestCustomers() {
  console.log('📊 INICIANDO SCRIPT DE PRUEBA - SOLO PARA ROUTER "TOCAHE"');

  const TARGET_ROUTER_NAME = 'TOCAHE';
  const ADMIN_USER_ID = 'b495da59-a89f-40d3-9cf8-8654a9624e02'; // <-- ¡VERIFICA Y CAMBIA ESTE ID!

  try {
    const allPlans = await prisma.plan.findMany();
    const targetRouter = await prisma.networkDevice.findFirst({
      where: {
        name: { equals: TARGET_ROUTER_NAME, mode: 'insensitive' },
        deviceType: 'MIKROTIK_ROUTER'
      }
    });

    if (!targetRouter) {
      console.error(`❌ PRERREQUISITO FALLIDO: El router de prueba "${TARGET_ROUTER_NAME}" no fue encontrado.`);
      return;
    }

    if (allPlans.length === 0) {
      console.error('❌ PRERREQUISITO FALLIDO: Debes tener al menos un Plan creado.');
      return;
    }

    console.log(`✅ Router de prueba "${targetRouter.name}" y ${allPlans.length} planes cargados.`);

    const workbook = XLSX.readFile('./CLINETS-PRUEBA.xlsx');
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    console.log(`📋 Encontrados ${rows.length - 1} registros en el Excel.`);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const routerNameInExcel = row[8];

      if (routerNameInExcel?.toLowerCase() !== TARGET_ROUTER_NAME.toLowerCase()) {
        continue;
      }

      const customerName = row[2];
      console.log(`\n🔄 Procesando cliente de ${TARGET_ROUTER_NAME}: ${customerName}`);

      try {
        const phoneValue = row[4];
        const processedPhone =
          (phoneValue &&
            String(phoneValue).trim() !== '' &&
            String(phoneValue).trim().toLowerCase() !== 'null')
            ? String(phoneValue)
            : '000000000';

        const rawDNI = row[3] ? String(row[3]).trim() : '';
        const processedDNI = (rawDNI && rawDNI.length === 8) ? rawDNI : null;

        const customerData = {
          name: customerName,
          documentNumber: processedDNI,
          phone: processedPhone,
          address: 'Dirección pendiente',
          district: TARGET_ROUTER_NAME,
        };

        const pppoeUsername = row[5];
        const pppoePassword = String(row[6]);
        const planName = row[7];

        if (!customerName || !customerData.phone || !pppoeUsername || !pppoePassword || !planName) {
          throw new Error('Faltan datos esenciales.');
        }

        const plan = allPlans.find(p => p.name.toLowerCase() === planName.toLowerCase());
        if (!plan) throw new Error(`Plan "${planName}" no encontrado en la BD.`);

        const newCustomer = await customerService.createCustomer(
          customerData,
          ADMIN_USER_ID,
          targetRouter.id,
          plan.id,
          pppoeUsername,
          pppoePassword
        );
        console.log(`✅ Cliente "${customerName}" creado con ID: ${newCustomer.id}`);

        const customerPlanPayload = {
          customerId: newCustomer.id,
          planId: plan.id,
          startDate: new Date().toISOString(),
          status: 'ACTIVE',
          changeType: 'NEW',
          notes: 'Importado desde Excel',
        };

        // --- CORRECCIÓN AQUÍ: Pasar el ADMIN_USER_ID como segundo argumento ---
        await customerPlanService.createCustomerPlan(customerPlanPayload, ADMIN_USER_ID);
        console.log(`✅ Plan "${plan.name}" asignado a "${customerName}".`);

      } catch (error) {
        console.error(`❌ Error procesando a "${customerName}": ${error.message}`);
      }
    }

    console.log('\n🎉 Importación de prueba finalizada.');

  } catch (error) {
    console.error('❌ Error fatal durante la importación de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importTestCustomers();

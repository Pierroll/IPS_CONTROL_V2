// /backend/import-customers-final.js (VERSIÓN DE PRODUCCIÓN)

const XLSX = require('xlsx');
const { PrismaClient } = require('./src/generated/prisma');
const customerService = require('./src/services/customerService.js');
const customerPlanService = require('./src/services/customerPlanService.js');

const prisma = new PrismaClient();

async function importAllCustomers() {
  console.log('📊 INICIANDO IMPORTACIÓN MASIVA DE TODOS LOS CLIENTES...');

  // --- CONFIGURACIÓN ---
  // ID del usuario que realiza la importación (debe ser un ID de usuario válido de tu BD)
  const ADMIN_USER_ID = 'b495da59-a89f-40d3-9cf8-8654a9624e02'; // <-- ¡VERIFICA Y CAMBIA ESTE ID!

  try {
    // 1. Cargar todos los planes y routers de la BD para un mapeo rápido
    const allPlans = await prisma.plan.findMany();
    const allRouters = await prisma.networkDevice.findMany({ where: { deviceType: 'MIKROTIK_ROUTER' } });
    console.log(`✅ Precargados ${allPlans.length} planes y ${allRouters.length} routers desde la BD.`);

    if (allRouters.length === 0 || allPlans.length === 0) {
      console.error('❌ PRERREQUISITO FALLIDO: Debes registrar al menos un Router y un Plan en el sistema antes de importar.');
      return;
    }

    // 2. Leer el archivo Excel
    const workbook = XLSX.readFile('./clientes_upload.xlsx'); // Asegúrate que el path es correcto
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    console.log(`📋 Encontrados ${rows.length - 1} registros en el Excel.`);

    // 3. Procesar cada fila del Excel
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const customerName = row[2];
      const routerNameInExcel = row[8];

      console.log(`\n🔄 Procesando fila ${i + 1}: ${customerName} (Router: ${routerNameInExcel})`);

      try {
        // Mapear datos de las columnas
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
          district: routerNameInExcel, // Usamos el nombre del router como distrito por defecto
        };

        const pppoeUsername = row[5];
        const pppoePassword = String(row[6]);
        const planName = row[7];

        // Validar datos esenciales
        if (!customerName || !customerData.phone || !pppoeUsername || !pppoePassword || !planName || !routerNameInExcel) {
          throw new Error('Faltan datos esenciales (Nombre, Teléfono, Usuario/Password PPPoE, Plan o Router).');
        }

        // Buscar IDs correspondientes en la BD
        const plan = allPlans.find(p => p.name.toLowerCase() === planName.toLowerCase());
        const router = allRouters.find(r => r.name.toLowerCase() === routerNameInExcel.toLowerCase());

        if (!plan) throw new Error(`Plan "${planName}" no encontrado en la BD.`);
        if (!router) throw new Error(`Router "${routerNameInExcel}" no encontrado en la BD.`);

        // --- PASO 1: Crear el cliente y su cuenta PPPoE ---
        const newCustomer = await customerService.createCustomer(
          customerData,
          ADMIN_USER_ID,
          router.id,
          plan.id,
          pppoeUsername,
          pppoePassword
        );
        console.log(`✅ Cliente "${customerName}" creado con ID: ${newCustomer.id}`);

        // --- PASO 2: Asignar el plan al cliente ---
        const customerPlanPayload = {
          customerId: newCustomer.id,
          planId: plan.id,
          startDate: new Date().toISOString(),
          status: 'ACTIVE',
          changeType: 'NEW',
          notes: 'Importado desde Excel',
        };

        await customerPlanService.createCustomerPlan(customerPlanPayload, ADMIN_USER_ID);
        console.log(`✅ Plan "${plan.name}" asignado a "${customerName}".`);

      } catch (error) {
        console.error(`❌ Error procesando a "${customerName}": ${error.message}`);
      }
    }

    console.log('\n🎉 Importación de todos los clientes finalizada.');

  } catch (error) {
    console.error('❌ Error fatal durante la importación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importAllCustomers();

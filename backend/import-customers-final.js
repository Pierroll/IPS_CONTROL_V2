// /backend/import-customers-final.js (NUEVA VERSIÓN CORREGIDA)

const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const customerService = require('./src/services/customerService.js');

const prisma = new PrismaClient();

async function importCustomers() {
   console.log('📊 Iniciando la importación masiva de clientes...');

   // --- CONFIGURACIÓN ---
   // ID del usuario que realiza la importación (debe ser un ID de usuario válido de tu BD)
   // Búscalo en la tabla User de Prisma Studio.
   const ADMIN_USER_ID = 'b495da59-a89f-40d3-9cf8-8654a9624e02'; // <-- ¡VERIFICA Y CAMBIA ESTE ID!

   try {
      // 1. Cargar datos de referencia desde la base de datos
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
      // Usamos header: 1 para leerlo como un array de arrays y evitar problemas con los nombres de columna
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      console.log(`📋 Encontrados ${rows.length - 1} clientes en el Excel (ignorando la cabecera).`);

      // 3. Procesar cada fila del Excel
      for (let i = 1; i < rows.length; i++) { // Empezar en 1 para saltar la cabecera
         const row = rows[i];
         const customerName = row[2]; // Columna C: JANET TRUJILLO

         console.log(`\n🔄 Procesando fila ${i + 1}: ${customerName}`);

         try {
            // Mapear datos de las columnas
            const customerData = {
               name: customerName,
               documentNumber: row[3] ? String(row[3]) : null, // Columna D: DNI (opcional)
               phone: String(row[4]), // Columna E: Telefono
               // Añade aquí más campos si los tienes en el Excel
               // address: row[X],
               // district: row[Y],
            };

            const pppoeUsername = row[5]; // Columna F: M_JanetTrujillo
            const pppoePassword = String(row[6]); // Columna G: bress-lan
            const planName = row[7]; // Columna H: PLAN_S/. 60.00
            const routerName = row[8]; // Columna I: MARIATEGUI

            // Validar datos esenciales para la importación
            if (!customerName || !customerData.phone || !pppoeUsername || !pppoePassword || !planName || !routerName) {
               throw new Error('Faltan datos esenciales (Nombre, Teléfono, Usuario/Password PPPoE, Plan o Router).');
            }

            // Buscar IDs correspondientes en la BD (insensible a mayúsculas/minúsculas)
            const plan = allPlans.find(p => p.name.toLowerCase() === planName.toLowerCase());
            const router = allRouters.find(r => r.name.toLowerCase() === routerName.toLowerCase());

            if (!plan) throw new Error(`Plan "${planName}" no fue encontrado en la base de datos.`);
            if (!router) throw new Error(`Router "${routerName}" no fue encontrado en la base de datos.`);

            // Llamar al servicio de creación de cliente (la lógica centralizada y segura)
            await customerService.createCustomer(
               customerData,
               ADMIN_USER_ID,
               router.id,
               plan.id,
               pppoeUsername,
               pppoePassword
            );

            console.log(`✅ Cliente "${customerName}" procesado e importado correctamente.`);

         } catch (error) {
            console.error(`❌ Error procesando a "${customerName}": ${error.message}`);
         }
      }

      console.log('\n🎉 Importación finalizada.');

   } catch (error) {
      console.error('❌ Error fatal durante el proceso de importación:', error);
   } finally {
      await prisma.$disconnect();
   }
}

importCustomers();
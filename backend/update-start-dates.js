const { PrismaClient } = require('./src/generated/prisma');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(tz);

const prisma = new PrismaClient();

// --- CONFIGURACIÓN ---
const TARGET_DATE_STRING = '2025-11-01'; // La fecha que quieres establecer
const BUSINESS_TZ = 'America/Lima';

async function updateStartDates() {
  console.log(`🔄 Iniciando actualización de fechas de inicio a ${TARGET_DATE_STRING}...`);

  try {
    // 1. Obtener todas las asignaciones de planes activas
    const customerPlans = await prisma.customerPlan.findMany({
      where: {
        status: 'ACTIVE', // Opcional: puedes quitar esto si quieres actualizar todos
      },
    });

    if (customerPlans.length === 0) {
      console.log('✅ No se encontraron asignaciones de planes para actualizar.');
      return;
    }

    console.log(`🔍 Encontrados ${customerPlans.length} planes para actualizar.`);

    // 2. Preparar la fecha objetivo
    // La convertimos al inicio del día en la zona horaria del negocio y luego a UTC
    // para ser consistentes con cómo la aplicación guarda las fechas.
    const targetDate = dayjs.tz(TARGET_DATE_STRING, BUSINESS_TZ).startOf('day').utc().toDate();
    console.log(`🎯 Fecha objetivo calculada (en UTC): ${targetDate.toISOString()}`);

    // 3. Actualizar cada registro
    let successCount = 0;
    for (const cp of customerPlans) {
      try {
        await prisma.customerPlan.update({
          where: { id: cp.id },
          data: { startDate: targetDate },
        });
        console.log(`✅ Plan ID ${cp.id} actualizado a ${targetDate.toISOString()}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error actualizando el plan ID ${cp.id}:`, error.message);
      }
    }

    console.log(`\n🎉 Actualización finalizada. ${successCount} de ${customerPlans.length} registros fueron actualizados.`);

  } catch (error) {
    console.error('❌ Error fatal durante la actualización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStartDates();

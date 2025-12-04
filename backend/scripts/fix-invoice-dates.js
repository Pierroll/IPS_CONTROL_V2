// Script para verificar y corregir fechas incorrectas en facturas
// Uso: node scripts/fix-invoice-dates.js [--dry-run] [--fix]

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);
dayjs.extend(timezone);

const LIMA_TZ = 'America/Lima';
const prisma = require('../src/models/prismaClient');

const DRY_RUN = process.argv.includes('--dry-run');
const FIX = process.argv.includes('--fix');

async function main() {
  console.log('🔍 Verificando facturas con fechas incorrectas...\n');
  console.log(`Modo: ${DRY_RUN ? '🔍 DRY-RUN (solo lectura)' : FIX ? '🔧 CORRECCIÓN ACTIVA' : '📊 SOLO VERIFICACIÓN'}\n`);

  try {
    // Obtener todas las facturas ordenadas por fecha de creación
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true }
        }
      }
    });

    console.log(`📋 Total de facturas encontradas: ${invoices.length}\n`);

    const now = dayjs().tz(LIMA_TZ);
    const currentDay = now.date();
    const currentMonth = now.month() + 1; // 1-12
    const currentYear = now.year();

    // Determinar qué mes debería estar facturándose
    // Si estamos antes del día 25, el mes facturado debería ser el mes anterior
    // Si estamos después del día 25, el mes facturado debería ser el mes actual
    let expectedMonth, expectedYear;
    if (currentDay < 25) {
      // Antes del 25: deberíamos estar viendo facturas del mes anterior
      const prevMonth = now.subtract(1, 'month');
      expectedMonth = prevMonth.month() + 1;
      expectedYear = prevMonth.year();
      console.log(`📅 Hoy es ${currentDay} de ${getMonthName(currentMonth)} ${currentYear}`);
      console.log(`📅 Como estamos antes del día 25, las facturas deberían ser de: ${getMonthName(expectedMonth)} ${expectedYear}\n`);
    } else {
      // Después del 25: deberíamos estar viendo facturas del mes actual
      expectedMonth = currentMonth;
      expectedYear = currentYear;
      console.log(`📅 Hoy es ${currentDay} de ${getMonthName(currentMonth)} ${currentYear}`);
      console.log(`📅 Como estamos después del día 25, las facturas deberían ser de: ${getMonthName(expectedMonth)} ${expectedYear}\n`);
    }

    const issues = [];
    const correct = [];

    for (const invoice of invoices) {
      const periodStart = dayjs(invoice.periodStart).tz(LIMA_TZ);
      const invoiceMonth = periodStart.month() + 1;
      const invoiceYear = periodStart.year();

      // Verificar si la factura tiene el mes incorrecto (mes siguiente)
      const nextMonth = dayjs(periodStart).add(1, 'month');
      const isNextMonth = invoiceMonth === nextMonth.month() + 1 && invoiceYear === nextMonth.year();

      // Verificar si la factura tiene el mes correcto
      const isCorrectMonth = invoiceMonth === expectedMonth && invoiceYear === expectedYear;

      // También verificar facturas del mes anterior si estamos después del 25
      const prevMonth = dayjs(periodStart).subtract(1, 'month');
      const isPrevMonth = currentDay >= 25 && invoiceMonth === prevMonth.month() + 1 && invoiceYear === prevMonth.year();

      if (isNextMonth || (!isCorrectMonth && !isPrevMonth)) {
        const shouldBeMonth = expectedMonth;
        const shouldBeYear = expectedYear;
        
        issues.push({
          invoice,
          currentMonth: invoiceMonth,
          currentYear: invoiceYear,
          shouldBeMonth,
          shouldBeYear,
          periodStart: invoice.periodStart,
          periodEnd: invoice.periodEnd,
          dueDate: invoice.dueDate
        });
      } else {
        correct.push({
          invoiceNumber: invoice.invoiceNumber,
          month: getMonthName(invoiceMonth),
          year: invoiceYear
        });
      }
    }

    console.log(`✅ Facturas correctas: ${correct.length}`);
    console.log(`⚠️  Facturas con problemas: ${issues.length}\n`);

    if (issues.length > 0) {
      console.log('📋 FACTURAS CON PROBLEMAS:\n');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. Factura: ${issue.invoice.invoiceNumber}`);
        console.log(`   Cliente: ${issue.invoice.customer.name}`);
        console.log(`   Mes actual: ${getMonthName(issue.currentMonth)} ${issue.currentYear}`);
        console.log(`   Debería ser: ${getMonthName(issue.shouldBeMonth)} ${issue.shouldBeYear}`);
        console.log(`   periodStart: ${dayjs(issue.periodStart).tz(LIMA_TZ).format('DD/MM/YYYY')}`);
        console.log(`   periodEnd: ${dayjs(issue.periodEnd).tz(LIMA_TZ).format('DD/MM/YYYY')}`);
        console.log(`   dueDate: ${dayjs(issue.dueDate).tz(LIMA_TZ).format('DD/MM/YYYY')}`);
        console.log('');
      });

      if (FIX && !DRY_RUN) {
        console.log('🔧 Iniciando corrección de facturas...\n');
        
        let fixed = 0;
        let errors = 0;

        for (const issue of issues) {
          try {
            // Calcular las nuevas fechas (mes anterior)
            const newPeriodStart = dayjs(issue.periodStart)
              .tz(LIMA_TZ)
              .subtract(1, 'month')
              .startOf('month')
              .toDate();
            
            const newPeriodEnd = dayjs(issue.periodEnd)
              .tz(LIMA_TZ)
              .subtract(1, 'month')
              .endOf('month')
              .toDate();

            // El dueDate debería ser periodEnd + 7 días
            const newDueDate = dayjs(newPeriodEnd)
              .add(7, 'days')
              .toDate();

            await prisma.invoice.update({
              where: { id: issue.invoice.id },
              data: {
                periodStart: newPeriodStart,
                periodEnd: newPeriodEnd,
                dueDate: newDueDate
              }
            });

            console.log(`✅ Corregida: ${issue.invoice.invoiceNumber} - ${issue.invoice.customer.name}`);
            console.log(`   Nuevo periodo: ${dayjs(newPeriodStart).tz(LIMA_TZ).format('DD/MM/YYYY')} - ${dayjs(newPeriodEnd).tz(LIMA_TZ).format('DD/MM/YYYY')}`);
            fixed++;
          } catch (error) {
            console.error(`❌ Error corrigiendo ${issue.invoice.invoiceNumber}:`, error.message);
            errors++;
          }
        }

        console.log(`\n🎉 Corrección completada:`);
        console.log(`   ✅ Corregidas: ${fixed}`);
        console.log(`   ❌ Errores: ${errors}`);
      } else if (DRY_RUN) {
        console.log('🔍 Modo DRY-RUN: No se realizaron cambios. Usa --fix para aplicar correcciones.');
      } else {
        console.log('💡 Para corregir las facturas, ejecuta el script con --fix:');
        console.log('   node scripts/fix-invoice-dates.js --fix');
      }
    } else {
      console.log('✅ Todas las facturas tienen fechas correctas.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function getMonthName(month) {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return months[month - 1];
}

main();


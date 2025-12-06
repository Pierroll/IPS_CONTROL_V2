// Script para enviar notificaciones de deuda a todos los clientes con saldo pendiente
// Uso: node scripts/send-debt-notifications-all.js [--dry-run] [--limit N] [--start-from N]
// Para cron: node /ruta/completa/scripts/send-debt-notifications-all.js
// Para continuar desde un cliente específico: node scripts/send-debt-notifications-all.js --start-from=267

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const prisma = require('../src/models/prismaClient');
const { postJson } = require('../src/utils/httpClient');

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(arg => arg.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : null;
const START_FROM_ARG = process.argv.find(arg => arg.startsWith('--start-from='));
const START_FROM = START_FROM_ARG ? parseInt(START_FROM_ARG.split('=')[1]) : 0;

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3001';

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

async function getCustomerPhone(customerId) {
  const c = await prisma.customer.findUnique({ 
    where: { id: customerId }, 
    select: { phone: true } 
  });
  
  if (!c?.phone) throw new Error('Cliente sin teléfono registrado');
  
  const cleaned = c.phone.replace(/[^\d]/g, '');
  if (cleaned.length === 9) return `51${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('51')) return cleaned;
  
  throw new Error('Número debe tener 9 dígitos (sin prefijo) o 11 con prefijo 51');
}

function generateDebtMessage(customer, invoice, balance) {
  const name = (customer?.name || 'Cliente').toUpperCase();
  const invoiceNumber = invoice?.invoiceNumber || 'N/A';
  const total = Number(invoice?.total || balance || 0).toFixed(2);
  
  const dueMonth = invoice?.periodStart 
    ? new Date(invoice.periodStart).toLocaleString('es-PE', { 
        month: 'long', 
        year: 'numeric',
        timeZone: 'America/Lima'
      }).toUpperCase()
    : 'ACTUAL';

  const billingDay = 25;
  const cutoffDay = 1;

  return (
`*${name}*, Su servicio *Internet* está próximo a vencer.

✅ Con N. de recibo: *${invoiceNumber}*
✅ del mes de: *${dueMonth}*
✅ Con periodo de pago: *${billingDay} De cada mes*
✅ Con día de corte: *${cutoffDay} De cada mes*
✅ Monto a pagar de: *S/ ${total}*

📢 *${name}*, se le recuerda que siempre debe enviar la constancia de pago para su registro.

💳 *NUESTROS MEDIOS DE PAGO*

📢 *DEPÓSITOS O TRANSFERENCIAS:*
✅ BANCO DE LA NACIÓN: 04582008812
✅ BANCO DE CRÉDITO: 56091215165073
✅ BANCO CONTINENTAL: 56091215165073
✅ CAJA PIURA: 210010010931
✅ CAJA HUANCAYO: 107072211001713046

✅ TITULAR DE LAS CTA.: *BRUNO RUFFNER HASSINGER*

📢 *PAGOS POR APP*

✅ PLIN: 987121219
✅ TITULAR DEL PLIN: *BRUNO RUFFNER HASSINGER*

✅ YAPE: 987121219
✅ TITULAR DEL YAPE: *BRUNO RUFFNER HASSINGER*

🚨 Si eres del extranjero recuerda pedir el *link de pago* 😉

✅ OJO: Enviar foto del *voucher* al https://wa.me/51987121219, para registrar su pago y enviar su *recibo digital*.

📢 Nota: Pedir que le envíen su comprobante.

*Horario de atención:*
LUNES A SÁBADO
⏲ 8:00 AM a 6:00 PM.

Att. Área de Cobranzas.`
  );
}

async function sendWhatsAppMessage(phone, message) {
  const url = `${WHATSAPP_API_URL}/api/send`;
  
  try {
    await postJson(url, {
      to: phone,
      message: message
    }, {
      'Content-Type': 'application/json'
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Iniciando envío masivo de notificaciones de deuda...\n');
  console.log(`Modo: ${DRY_RUN ? '🔍 DRY-RUN (solo simulación)' : '📤 ENVÍO REAL'}`);
  console.log(`API WhatsApp: ${WHATSAPP_API_URL}`);
  if (START_FROM > 0) {
    console.log(`📍 Continuando desde el cliente #${START_FROM}`);
  }
  console.log('');

  try {
    // Buscar todos los clientes con deuda
    const customers = await prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        billingAccount: {
          balance: { gt: 0 }
        }
      },
      include: {
        billingAccount: {
          select: {
            balance: true,
            status: true
          }
        },
        invoices: {
          where: {
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
            balanceDue: { gt: 0 }
          },
          orderBy: { dueDate: 'desc' },
          take: 1
        }
      },
      orderBy: { name: 'asc' },
      ...(LIMIT && { take: LIMIT })
    });

    console.log(`📊 Clientes con deuda encontrados: ${customers.length}\n`);

    if (customers.length === 0) {
      console.log('✅ No hay clientes con deuda para notificar.');
      return;
    }

    // Validar START_FROM
    if (START_FROM >= customers.length) {
      console.log(`⚠️  El índice de inicio (${START_FROM}) es mayor o igual al total de clientes (${customers.length})`);
      console.log('✅ No hay más clientes para procesar.');
      return;
    }

    if (START_FROM > 0) {
      console.log(`⏭️  Omitiendo los primeros ${START_FROM} clientes (ya procesados)\n`);
    }

    const results = {
      total: customers.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (let i = START_FROM; i < customers.length; i++) {
      const customer = customers[i];
      const latestInvoice = customer.invoices?.[0];
      const balance = Number(customer.billingAccount?.balance || 0);

      console.log(`\n[${i + 1}/${customers.length}] Procesando: ${customer.name}`);
      console.log(`   Balance: S/ ${balance.toFixed(2)}`);
      console.log(`   Factura: ${latestInvoice?.invoiceNumber || 'Sin factura'}`);

      // Obtener teléfono
      let phone;
      try {
        phone = await getCustomerPhone(customer.id);
        console.log(`   Teléfono: ${phone}`);
      } catch (error) {
        console.log(`   ⚠️  ${error.message}`);
        results.skipped++;
        results.errors.push({
          customer: customer.name,
          customerId: customer.id,
          error: error.message
        });
        continue;
      }

      // Generar mensaje
      const message = generateDebtMessage(customer, latestInvoice, balance);
      
      if (DRY_RUN) {
        console.log(`   🔍 [DRY-RUN] Mensaje generado (${message.length} caracteres)`);
        console.log(`   🔍 [DRY-RUN] No se enviaría el mensaje`);
        results.sent++; // Contar como enviado en dry-run
        continue;
      }

      // Enviar mensaje
      try {
        const result = await sendWhatsAppMessage(phone, message);
        
        if (result.success) {
          console.log(`   ✅ Mensaje enviado exitosamente`);
          results.sent++;
          
          // Registrar en MessageLog
          try {
            await prisma.messageLog.create({
              data: {
                customerId: customer.id,
                invoiceId: latestInvoice?.id,
                channel: 'WHATSAPP',
                messageType: 'PAYMENT_REMINDER',
                content: message,
                status: 'SENT',
                sentAt: new Date(),
                phoneNumber: phone,
              }
            });
          } catch (logError) {
            console.log(`   ⚠️  Error registrando en log: ${logError.message}`);
          }
        } else {
          console.log(`   ❌ Error: ${result.error}`);
          results.failed++;
          results.errors.push({
            customer: customer.name,
            customerId: customer.id,
            phone,
            error: result.error
          });
          
          // Registrar como FAILED
          try {
            await prisma.messageLog.create({
              data: {
                customerId: customer.id,
                invoiceId: latestInvoice?.id,
                channel: 'WHATSAPP',
                messageType: 'PAYMENT_REMINDER',
                content: message,
                status: 'FAILED',
                errorMessage: result.error,
                phoneNumber: phone,
              }
            });
          } catch (logError) {
            console.log(`   ⚠️  Error registrando en log: ${logError.message}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error inesperado: ${error.message}`);
        results.failed++;
        results.errors.push({
          customer: customer.name,
          customerId: customer.id,
          phone,
          error: error.message
        });
      }

      // Esperar 20 segundos entre envíos para evitar bloqueos de WhatsApp
      if (i < customers.length - 1 && !DRY_RUN) {
        const waitSeconds = 20;
        console.log(`   ⏳ Esperando ${waitSeconds} segundos antes del siguiente envío...`);
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      }
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(60));
    console.log(`Total procesados: ${results.total}`);
    console.log(`✅ Enviados: ${results.sent}`);
    console.log(`❌ Fallidos: ${results.failed}`);
    console.log(`⏭️  Omitidos: ${results.skipped}`);

    if (results.errors.length > 0) {
      console.log('\n❌ ERRORES DETALLADOS:');
      results.errors.forEach((err, idx) => {
        console.log(`\n${idx + 1}. ${err.customer} (${err.customerId})`);
        console.log(`   Error: ${err.error}`);
        if (err.phone) console.log(`   Teléfono: ${err.phone}`);
      });
    }

    console.log('\n🎉 Proceso completado.');

  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

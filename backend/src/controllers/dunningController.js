// backend/src/controllers/dunningController.js
const prisma = require('../models/prismaClient');
const dayjs = require('dayjs');
const notificationService = require('../services/notificationService');
const billingService = require('../services/billingService');

const previewToday = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        customerPlans: { some: { status: 'ACTIVE' } },
        billingAccount: { balance: { gt: 0 } },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        billingAccount: { select: { balance: true } },
      },
    });
    res.json({ date: dayjs().toISOString(), count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ⚠️ Este endpoint envía un recordatorio manual a un cliente
const sendManualReminder = async (req, res) => {
  try {
    const { customerId } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        billingAccount: true,
        customerPlans: { where: { status: 'ACTIVE' }, include: { plan: true } },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });

    // La factura más reciente pendiente/overdue
    const invoice = await billingService.getLatestPendingInvoice(customerId);
    if (!invoice) return res.status(404).json({ error: 'No hay facturas pendientes' });

    const message = generateReminderMessageWA(customer, invoice);
    const log = await notificationService.sendPaymentReminder(customerId, message, invoice.id);

    res.json(log);
  } catch (err) {
    console.error('Error en sendManualReminder:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Nuevo: listar con filtros (incluye fallidos)
const getNotifications = async (req, res) => {
  try {
    const { customerId, from, to, status, channel, messageType } = req.query;
    const notifications = await notificationService.getNotifications({ customerId, from, to, status, channel, messageType });
    res.json(notifications);
  } catch (err) {
    console.error('Error en getNotifications:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Nuevo: reintentar por id de MessageLog (solo si FAILED)
const retryNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await prisma.messageLog.findUnique({ where: { id } });
    if (!log) return res.status(404).json({ error: 'Log no encontrado' });
    if (log.status !== 'FAILED') return res.status(400).json({ error: 'Solo se puede reintentar si está en FAILED' });

    // Antispam: no reintentar si fue fallido hace <60s
    if (log.updatedAt && (Date.now() - new Date(log.updatedAt).getTime()) < 60000)
      return res.status(429).json({ error: 'Espere 60s antes de reintentar' });

    const message = log.content; // reusar el mismo contenido
    const result = await notificationService.sendPaymentReminder(log.customerId, message, log.invoiceId || undefined);
    // (Opcional) incrementar retryCount en el original
    await prisma.messageLog.update({ where: { id: log.id }, data: { retryCount: (log.retryCount || 0) + 1 } });

    res.json(result);
  } catch (err) {
    console.error('Error en retryNotification:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Formato WhatsApp con negritas
function generateReminderMessageWA(customer, invoice) {
  const name = (customer?.name || 'Cliente').toUpperCase();
  const invoiceNumber = invoice?.invoiceNumber || 'N/A';
  const total = Number(invoice?.total || 0).toFixed(2);
  const dueMonth = new Date(invoice.periodStart).toLocaleString('es-PE', { month: 'long', year: 'numeric' }).toUpperCase();

  const billingDay = 25;
  const cutoffDay = 1;

  return (
`${name} Su servicio *Internet* está próximo a vencer.

✅ Con N. de recibo: ${invoiceNumber}
✅ del mes de: ${dueMonth}
✅ Con periodo de pago: *25 De cada mes*
✅ Con día de corte: *1 De cada mes*
✅ Monto a pagar de: *${total}*

📢 *${name}*, se le recuerda que siempre debe enviar la constancia de pago para su registro.

💳 NUESTROS MEDIOS DE PAGO

📢 DEPOSITOS O TRANSFERENCIAS:
✅ BANCO DE LA NACION: 04582008812
✅ BANCO DE CREDITO: 56091215165073
✅ BANCO CONTINENTAL: 56091215165073
✅ CAJA PIURA: 210010010931
✅ CAJA HUANCAYO: 107072211001713046

✅ TITULAR DE LAS CTA.: BRUNO RUFFNER HASSINGER

📢 PAGOS POR APP

✅ PLIN: 987121219
✅ TITULAR DEL PLIN: BRUNO RUFFNER HASSINGER

✅ YAPE: 987121219
✅ TITULAR DEL YAPE.: BRUNO RUFFNER HASSINGER

🚨 Si eres del extrajero recuerdo pedir el link de pago 😉

✅ OJO: Enviar foto del Boucher del depósito o trasferencia al https://wa.me/51987121219, para que le se suba su pago al sistema y le envié su recibo digital.

📢 Nota: Pedir que le envíen su comprobante.

Horario de atención:
LUNES A SABADO
⏲ 8.00 AM a 6.00 PM.

Att. Área de Cobranzas.`
  );
}

// ✅ Nuevo: Cortar servicio a todos los clientes morosos
const cutAllOverdueCustomers = async (req, res) => {
  try {
    const { cutProfile } = req.body || {};
    const profile = cutProfile || 'CORTE MOROSO';
    
    console.log(`🔪 Iniciando corte masivo de clientes morosos...`);
    
    const pppoeService = require('../services/pppoeService');
    const result = await pppoeService.cutAllOverdueCustomers(profile);
    
    res.json({
      success: true,
      message: `Corte masivo completado: ${result.cut} clientes cortados, ${result.failed} fallidos`,
      data: result
    });
  } catch (err) {
    console.error('❌ Error en cutAllOverdueCustomers:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

module.exports = { previewToday, sendManualReminder, getNotifications, retryNotification, cutAllOverdueCustomers };

// ============================================
// 📁 backend/src/controllers/notificationController.js
// ============================================

const notificationService = require('../services/notificationService');
const prisma = require('../models/prismaClient');
const billingService = require('../services/billingService');

/**
 * GET /api/notifications
 * Lista todas las notificaciones (MessageLog) con filtros
 */
const getNotifications = async (req, res) => {
  try {
    const { customerId, from, to, status, channel } = req.query;
    
    const notifications = await notificationService.getNotifications({ 
      customerId, 
      from, 
      to,
      status,
      channel
    });
    
    res.json(notifications);
  } catch (error) {
    console.error('❌ Error al obtener notificaciones:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/notifications/send
 * Envía un recordatorio de pago a un cliente específico
 */
const sendNotification = async (req, res) => {
  try {
    const { customerId, message, invoiceId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ 
        error: 'customerId es requerido' 
      });
    }

    // Si no hay mensaje, generar uno automático
    let finalMessage = message;
    
    if (!finalMessage) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          billingAccount: true,
          customerPlans: { 
            where: { status: 'ACTIVE' }, 
            include: { plan: true } 
          },
        },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      // Buscar factura más reciente pendiente
      const invoice = await prisma.invoice.findFirst({
        where: {
          customerId,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
        },
        orderBy: { dueDate: 'desc' },
      });

      if (!invoice) {
        return res.status(404).json({ 
          error: 'No hay facturas pendientes para este cliente' 
        });
      }

      // Generar mensaje con formato WhatsApp
      finalMessage = generateReminderMessageWA(customer, invoice);
    }

    const notification = await notificationService.sendPaymentReminder(
      customerId, 
      finalMessage, 
      invoiceId
    );

    res.status(201).json({
      message: 'Notificación enviada exitosamente',
      notification
    });
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/notifications/send-bulk
 * Envía notificaciones masivas a múltiples clientes
 */
const sendBulkNotifications = async (req, res) => {
  try {
    const { customerIds, message } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({ 
        error: 'customerIds debe ser un array no vacío' 
      });
    }

    const results = [];
    const errors = [];

    for (const customerId of customerIds) {
      try {
        // Obtener datos del cliente
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          include: {
            billingAccount: true,
            customerPlans: { 
              where: { status: 'ACTIVE' }, 
              include: { plan: true } 
            },
          },
        });

        if (!customer) {
          errors.push({ 
            customerId, 
            status: 'failed', 
            error: 'Cliente no encontrado' 
          });
          continue;
        }

        // Buscar factura pendiente
        const invoice = await prisma.invoice.findFirst({
          where: {
            customerId,
            status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
          },
          orderBy: { dueDate: 'desc' },
        });

        if (!invoice) {
          errors.push({ 
            customerId, 
            status: 'failed', 
            error: 'Sin facturas pendientes' 
          });
          continue;
        }

        // Generar mensaje personalizado o usar el genérico
        const finalMessage = message || generateReminderMessageWA(customer, invoice);

        const notification = await notificationService.sendPaymentReminder(
          customerId,
          finalMessage,
          invoice.id
        );

        results.push({ customerId, status: 'sent', notification });
      } catch (error) {
        console.error(`❌ Error enviando a ${customerId}:`, error.message);
        errors.push({ 
          customerId, 
          status: 'failed', 
          error: error.message 
        });
      }
    }

    res.json({
      message: `Enviadas ${results.length} de ${customerIds.length} notificaciones`,
      sent: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('❌ Error en envío masivo:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/notifications/:id/resend
 * Reenvía una notificación existente (solo si FAILED)
 */
const resendNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const original = await prisma.messageLog.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!original) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    // Solo permitir reenvío si falló
    if (original.status === 'SENT' || original.status === 'DELIVERED') {
      return res.status(400).json({ 
        error: 'Solo se pueden reenviar notificaciones fallidas' 
      });
    }

    // Anti-spam: esperar 60s entre reintentos
    if (original.updatedAt) {
      const timeSinceLastUpdate = Date.now() - new Date(original.updatedAt).getTime();
      if (timeSinceLastUpdate < 60000) {
        return res.status(429).json({ 
          error: 'Debe esperar 60 segundos antes de reintentar' 
        });
      }
    }

    // Reenviar con el mismo mensaje
    const notification = await notificationService.sendPaymentReminder(
      original.customerId,
      original.content,
      original.invoiceId
    );

    // Incrementar contador de reintentos en el registro original
    await prisma.messageLog.update({
      where: { id: original.id },
      data: { retryCount: (original.retryCount || 0) + 1 }
    });

    res.json({
      message: 'Notificación reenviada exitosamente',
      notification
    });
  } catch (error) {
    console.error('❌ Error al reenviar notificación:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Genera mensaje con formato WhatsApp (negritas con *)
 */
function generateReminderMessageWA(customer, invoice) {
  const name = (customer?.name || 'Cliente').toUpperCase();
  const invoiceNumber = invoice?.invoiceNumber || 'N/A';
  const total = Number(invoice?.total || 0).toFixed(2);
  const dueMonth = new Date(invoice.periodStart)
    .toLocaleString('es-PE', { month: 'long', year: 'numeric' })
    .toUpperCase();

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

module.exports = {
  getNotifications,
  sendNotification,
  sendBulkNotifications,
  resendNotification
};
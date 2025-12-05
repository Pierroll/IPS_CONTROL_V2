// backend/src/services/reportService.js
const prisma = require('../models/prismaClient');

/**
 * Genera reporte de pagos con filtros
 */
async function reportPayments(filters = {}) {
  const {
    createdBy,
    from,
    to,
    deviceId,
    customerId,
    paymentMethod,
  } = filters;

  // Construir condiciones WHERE
  const where = {};

  // Filtro por usuario que creó el pago
  if (createdBy) {
    where.createdBy = createdBy;
  }

  // Filtro por rango de fechas
  if (from || to) {
    where.paymentDate = {};
    if (from) {
      where.paymentDate.gte = new Date(from);
    }
    if (to) {
      // Incluir todo el día (hasta las 23:59:59)
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.paymentDate.lte = toDate;
    }
  }

  // Filtro por método de pago
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  // Filtro por cliente
  if (customerId) {
    where.customerId = customerId;
  }

  // Filtro por dispositivo/MikroTik
  // Si hay deviceId, necesitamos filtrar por los clientes que tienen PPPoE accounts en ese dispositivo
  let customerIdsByDevice = null;
  if (deviceId) {
    const pppoeAccounts = await prisma.pppoeAccount.findMany({
      where: { deviceId },
      select: { customerId: true },
    });
    customerIdsByDevice = pppoeAccounts.map((acc) => acc.customerId);
    
    if (customerIdsByDevice.length === 0) {
      // No hay clientes con ese dispositivo, retornar array vacío
      return {
        payments: [],
        summary: {
          totalPayments: 0,
          totalAmount: 0,
          byMethod: {},
        },
      };
    }

    // Si también hay customerId, hacer intersección
    if (customerId) {
      if (!customerIdsByDevice.includes(customerId)) {
        return {
          payments: [],
          summary: {
            totalPayments: 0,
            totalAmount: 0,
            byMethod: {},
          },
        };
      }
      // Si el customerId está en la lista, mantener el filtro
    } else {
      // Si solo hay deviceId, filtrar por esos customerIds
      where.customerId = { in: customerIdsByDevice };
    }
  }

  // Obtener pagos con relaciones
  const payments = await prisma.payment.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      paymentDate: 'desc',
    },
  });

  // Calcular resumen
  const summary = {
    totalPayments: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    byMethod: {},
  };

  // Agrupar por método de pago
  payments.forEach((payment) => {
    const method = payment.paymentMethod || 'UNKNOWN';
    if (!summary.byMethod[method]) {
      summary.byMethod[method] = {
        count: 0,
        total: 0,
      };
    }
    summary.byMethod[method].count++;
    summary.byMethod[method].total += Number(payment.amount || 0);
  });

  return {
    payments,
    summary,
  };
}

module.exports = {
  reportPayments,
};


const prisma = require('../models/prismaClient');
const Joi = require('joi');
const { toDate } = require('../utils/date');

const reportPaymentsSchema = Joi.object({
  createdBy: Joi.string().uuid().optional(),
  from: Joi.string().optional(),
  to: Joi.string().optional(),
  deviceId: Joi.string().uuid().optional(),
  customerId: Joi.string().uuid().optional(),
  paymentMethod: Joi.string().optional(),
});

const reportPayments = async (rawQuery = {}) => {
  const { error, value } = reportPaymentsSchema.validate(rawQuery, { stripUnknown: true });
  if (error) throw new Error(error.details.map((d) => d.message).join('; '));

  const { createdBy, from, to, deviceId, customerId, paymentMethod } = value;

  // Construir el where clause
  const where = {};

  // Filtro por usuario que hizo el pago
  if (createdBy) {
    where.createdBy = createdBy;
  }

  // Filtro por método de pago
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  // Filtro por fechas
  if (from || to) {
    where.paymentDate = {};
    if (from) {
      where.paymentDate.gte = toDate(from, 'from');
    }
    if (to) {
      where.paymentDate.lte = toDate(to, 'to');
    }
  }

  // Filtro por cliente
  if (customerId) {
    where.customerId = customerId;
  }

  // Filtro por dispositivo Mikrotik
  // Si se especifica deviceId, necesitamos filtrar por clientes que tengan cuentas PPPoE en ese dispositivo
  if (deviceId) {
    const customersWithDevice = await prisma.pppoeAccount.findMany({
      where: {
        deviceId: deviceId,
        deletedAt: null,
      },
      select: {
        customerId: true,
      },
      distinct: ['customerId'],
    });

    const customerIds = customersWithDevice.map((acc) => acc.customerId);
    
    if (customerIds.length === 0) {
      // Si no hay clientes con ese dispositivo, retornar array vacío
      return [];
    }

    // Si ya hay un filtro por customerId, verificar que coincida
    if (customerId && !customerIds.includes(customerId)) {
      return [];
    }

    // Agregar filtro por customerIds
    if (customerId) {
      where.customerId = customerId;
    } else {
      where.customerId = { in: customerIds };
    }
  }

  // Obtener pagos con relaciones necesarias
  const payments = await prisma.payment.findMany({
    where,
    orderBy: [{ paymentDate: 'desc' }],
    include: {
      customer: {
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
          email: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
        },
      },
      billingAccount: {
        select: {
          id: true,
        },
      },
    },
  });

  // Para cada pago, obtener el dispositivo Mikrotik asociado (si existe)
  const paymentsWithDevices = await Promise.all(
    payments.map(async (payment) => {
      // Buscar la cuenta PPPoE del cliente para obtener el dispositivo
      const pppoeAccount = await prisma.pppoeAccount.findFirst({
        where: {
          customerId: payment.customerId,
          deletedAt: null,
        },
        include: {
          device: {
            select: {
              id: true,
              name: true,
              code: true,
              ipAddress: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        ...payment,
        device: pppoeAccount?.device || null,
      };
    })
  );

  return paymentsWithDevices;
};

module.exports = {
  reportPayments,
};


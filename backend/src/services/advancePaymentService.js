const { PrismaClient } = require('../generated/prisma');
const Joi = require('joi');
const dayjs = require('dayjs');

const prisma = new PrismaClient();

// Esquemas de validación
const createAdvancePaymentSchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  months: Joi.array().items(
    Joi.object({
      month: Joi.number().integer().min(1).max(12).required(),
      year: Joi.number().integer().min(2025).required(),
      amount: Joi.number().positive().required()
    })
  ).min(1).required(),
  paymentMethod: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'DIGITAL_WALLET').required(),
  reference: Joi.string().optional().allow(''),
  notes: Joi.string().optional().allow(''),
  paymentDate: Joi.date().optional(),
  createdBy: Joi.string().uuid().required()
});

const deleteAdvancePaymentSchema = Joi.object({
  advancePaymentId: Joi.string().uuid().required()
});

// Crear pago adelantado
const createAdvancePayment = async (data) => {
  console.log('🔄 Creando pago adelantado:', data);
  
  const { error, value } = createAdvancePaymentSchema.validate(data);
  if (error) {
    throw new Error(`Datos inválidos: ${error.details[0].message}`);
  }

  const {
    customerId,
    months,
    paymentMethod,
    reference,
    notes,
    paymentDate,
    createdBy
  } = value;

  // Calcular monto total
  const totalAmount = months.reduce((sum, month) => sum + month.amount, 0);
  const monthsCount = months.length;

  // Verificar que el cliente existe y tiene cuenta de facturación
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { billingAccount: true }
  });

  if (!customer) {
    throw new Error('Cliente no encontrado');
  }

  if (!customer.billingAccount) {
    throw new Error('El cliente no tiene cuenta de facturación');
  }

  // Verificar que no hay pagos adelantados duplicados para los mismos meses
  for (const monthData of months) {
    const existingPayment = await prisma.advanceMonthlyPayment.findFirst({
      where: {
        advancePayment: {
          customerId,
          status: 'ACTIVE'
        },
        month: monthData.month,
        year: monthData.year,
        status: 'PENDING'
      }
    });

    if (existingPayment) {
      const monthName = getMonthName(monthData.month);
      throw new Error(`Ya existe un pago adelantado para ${monthName} ${monthData.year}`);
    }
  }

  // Crear el pago adelantado y los pagos mensuales en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // Crear el pago adelantado principal
    const advancePayment = await tx.advancePayment.create({
      data: {
        customerId,
        billingAccountId: customer.billingAccount.id,
        totalAmount,
        monthsCount,
        amountPerMonth: totalAmount / monthsCount, // Para compatibilidad
        paymentMethod,
        reference: reference || null,
        notes: notes || null,
        paymentDate: paymentDate || new Date(),
        createdBy,
        status: 'ACTIVE'
      }
    });

    // Crear los pagos mensuales específicos
    const monthlyPayments = [];
    for (const monthData of months) {
      const monthlyPayment = await tx.advanceMonthlyPayment.create({
        data: {
          advancePaymentId: advancePayment.id,
          month: monthData.month,
          year: monthData.year,
          amount: monthData.amount,
          status: 'PENDING'
        }
      });
      monthlyPayments.push(monthlyPayment);
    }

    // NO actualizar el saldo de la cuenta de facturación
    // Los pagos adelantados se manejan por separado y se aplican automáticamente
    // cuando se generen las facturas correspondientes

    // Crear entrada en el ledger para registro
    await tx.ledgerEntry.create({
      data: {
        customerId,
        billingAccountId: customer.billingAccount.id,
        type: 'CREDIT',
        amount: totalAmount,
        description: `Pago adelantado para ${monthsCount} meses específicos - ${advancePayment.id}`,
        referenceType: 'ADVANCE_PAYMENT',
        referenceId: advancePayment.id,
        transactionDate: paymentDate || new Date()
      }
    });

    return {
      advancePayment,
      monthlyPayments
    };
  });

  console.log('✅ Pago adelantado creado:', result.advancePayment.id);
  
  return result;
};

// Función auxiliar para obtener nombre del mes
const getMonthName = (month) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || `Mes ${month}`;
};

// Obtener pagos adelantados de un cliente
const getAdvancePaymentsByCustomer = async (customerId) => {
  const advancePayments = await prisma.advancePayment.findMany({
    where: { 
      customerId,
      status: 'ACTIVE'
    },
    include: {
      monthlyPayments: {
        orderBy: [
          { year: 'asc' },
          { month: 'asc' }
        ]
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return advancePayments;
};

// Obtener todos los pagos adelantados
const getAllAdvancePayments = async (filters = {}) => {
  const where = {};
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  const advancePayments = await prisma.advancePayment.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          code: true,
          phone: true
        }
      },
      monthlyPayments: {
        orderBy: [
          { year: 'asc' },
          { month: 'asc' }
        ]
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return advancePayments;
};

// Eliminar pago adelantado
const deleteAdvancePayment = async (data) => {
  console.log('🗑️ Eliminando pago adelantado:', data);
  
  const { error, value } = deleteAdvancePaymentSchema.validate(data);
  if (error) {
    throw new Error(`Datos inválidos: ${error.details[0].message}`);
  }

  const { advancePaymentId } = value;

  // Verificar que el pago adelantado existe
  const advancePayment = await prisma.advancePayment.findUnique({
    where: { id: advancePaymentId },
    include: {
      customer: {
        include: {
          billingAccount: true
        }
      },
      monthlyPayments: true
    }
  });

  if (!advancePayment) {
    throw new Error('Pago adelantado no encontrado');
  }

  if (advancePayment.status === 'CANCELLED') {
    throw new Error('El pago adelantado ya fue cancelado');
  }

  // Verificar que no hay pagos mensuales aplicados
  const appliedPayments = advancePayment.monthlyPayments.filter(p => p.status === 'APPLIED');
  if (appliedPayments.length > 0) {
    throw new Error('No se puede eliminar un pago adelantado que ya tiene pagos aplicados');
  }

  // Eliminar el pago adelantado en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // NO revertir el saldo de la cuenta de facturación
    // Los pagos adelantados se manejan por separado

    // Crear entrada en el ledger para registro de cancelación
    await tx.ledgerEntry.create({
      data: {
        customerId: advancePayment.customerId,
        billingAccountId: advancePayment.billingAccountId,
        type: 'DEBIT',
        amount: advancePayment.totalAmount,
        description: `Cancelación de pago adelantado - ${advancePayment.id}`,
        referenceType: 'ADVANCE_PAYMENT_CANCELLATION',
        referenceId: advancePayment.id,
        transactionDate: new Date()
      }
    });

    // Eliminar pagos mensuales (se eliminan automáticamente por CASCADE)
    // Actualizar el estado del pago adelantado
    const updatedAdvancePayment = await tx.advancePayment.update({
      where: { id: advancePaymentId },
      data: {
        status: 'CANCELLED'
      }
    });

    return updatedAdvancePayment;
  });

  console.log('✅ Pago adelantado eliminado:', result.id);
  return result;
};

// Aplicar pago adelantado a una factura (se llamará desde el job de facturación)
const applyAdvancePaymentToInvoice = async (customerId, invoiceId, month, year) => {
  console.log(`🔄 Aplicando pago adelantado para ${customerId} - ${month}/${year}`);
  
  // Buscar pagos mensuales pendientes para este cliente, mes y año
  const monthlyPayment = await prisma.advanceMonthlyPayment.findFirst({
    where: {
      advancePayment: {
        customerId,
        status: 'ACTIVE'
      },
      month,
      year,
      status: 'PENDING'
    },
    include: {
      advancePayment: true
    }
  });

  if (!monthlyPayment) {
    return null; // No hay pago adelantado para este mes
  }

  // Aplicar el pago mensual
  const result = await prisma.$transaction(async (tx) => {
    // Actualizar el pago mensual
    const updatedMonthlyPayment = await tx.advanceMonthlyPayment.update({
      where: { id: monthlyPayment.id },
      data: {
        status: 'APPLIED',
        appliedAt: new Date(),
        appliedToInvoiceId: invoiceId
      }
    });

    // Actualizar el saldo de la cuenta de facturación (reducir crédito)
    await tx.billingAccount.update({
      where: { id: monthlyPayment.advancePayment.billingAccountId },
      data: {
        balance: {
          decrement: monthlyPayment.amount
        }
      }
    });

    // Crear entrada en el ledger
    await tx.ledgerEntry.create({
      data: {
        customerId,
        billingAccountId: monthlyPayment.advancePayment.billingAccountId,
        type: 'DEBIT',
        amount: monthlyPayment.amount,
        description: `Aplicación de pago adelantado - ${month}/${year}`,
        invoiceId,
        referenceType: 'ADVANCE_PAYMENT_APPLICATION',
        referenceId: monthlyPayment.id,
        transactionDate: new Date()
      }
    });

    return updatedMonthlyPayment;
  });

  console.log('✅ Pago adelantado aplicado:', result.id);
  return result;
};

// Aplicar pagos adelantados a facturas pendientes existentes
const applyToPendingInvoices = async () => {
  console.log('🔄 Aplicando pagos adelantados a facturas pendientes existentes...');
  
  const currentDate = dayjs();
  const currentMonth = currentDate.month() + 1; // dayjs usa 0-11, necesitamos 1-12
  const currentYear = currentDate.year();

  console.log(`📅 Aplicando pagos adelantados para ${currentMonth}/${currentYear}`);

  // Buscar todas las facturas pendientes que ya existen (no futuras)
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      status: 'PENDING',
      periodStart: {
        lte: new Date(currentYear, currentMonth - 1, 31) // Hasta el último día del mes actual
      }
    },
    include: {
      customer: true
    }
  });

  console.log(`📋 Encontradas ${pendingInvoices.length} facturas pendientes existentes para aplicar pagos adelantados`);

  let appliedCount = 0;
  for (const invoice of pendingInvoices) {
    try {
      // Obtener el mes y año de la factura
      const invoiceDate = dayjs(invoice.periodStart);
      const invoiceMonth = invoiceDate.month() + 1;
      const invoiceYear = invoiceDate.year();
      
      const result = await applyAdvancePaymentToInvoice(
        invoice.customerId,
        invoice.id,
        invoiceMonth,
        invoiceYear
      );

      if (result) {
        appliedCount++;
        console.log(`✅ Pago adelantado aplicado para cliente ${invoice.customerId} - Factura ${invoice.invoiceNumber}`);
      }
    } catch (error) {
      console.error(`❌ Error aplicando pago adelantado para cliente ${invoice.customerId}:`, error.message);
    }
  }

  console.log(`🎉 Aplicación de pagos adelantados completada: ${appliedCount} pagos aplicados`);

  return {
    appliedCount,
    totalInvoices: pendingInvoices.length
  };
};

module.exports = {
  createAdvancePayment,
  getAdvancePaymentsByCustomer,
  getAllAdvancePayments,
  deleteAdvancePayment,
  applyAdvancePaymentToInvoice,
  applyToPendingInvoices
};

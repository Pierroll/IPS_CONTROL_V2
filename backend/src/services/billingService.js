// billingService.js
/* eslint-disable no-console */
const prisma = require('../models/prismaClient');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);
dayjs.extend(timezone);

const LIMA_TZ = 'America/Lima';
const { generateInvoicePdf } = require('./invoicePdfService');
const { sendWhatsAppWithDocument } = require('./notificationService');
const {
  createInvoiceSchema,
  recordPaymentSchema,
  updateBillingAccountSchema,
  listInvoicesSchema,
  listPaymentsSchema,
  listBillingAccountsSchema,
} = require('../validations/billingValidation');

/* =========================
 * Constantes & Helpers
 * ========================= */
const DEFAULT_CURRENCY = 'PEN';
const DUE_DAYS = 7;

/** Convierte a número seguro (NaN => 0) */
const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

/** Fecha segura (acepta string/Date), devuelve Date o lanza error */
const toDate = (d, label = 'date') => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) throw new Error(`Fecha inválida para ${label}`);
  return dt;
};

/** Nombre seguro para paths */
const safeName = (s = '') => String(s).replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '').trim();

/** Calcula subtotal/total con impuestos/desc. */
const computeTotals = (items = [], tax = 0, discount = 0) => {
  const subtotal = items.reduce((acc, it) => acc + num(it.quantity) * num(it.unitPrice), 0);
  const total = subtotal + num(tax) - num(discount);
  return { subtotal, total };
};

/** Garantiza existencia de la cuenta de facturación */
const ensureBillingAccount = async (customerId) => {
  let ba = await prisma.billingAccount.findUnique({ where: { customerId } });
  if (!ba) {
    ba = await prisma.billingAccount.create({
      data: {
        customerId,
        balance: 0,
        creditLimit: 500.0,
        status: 'ACTIVE',
        billingCycle: 1,
        autoSuspend: true,
      },
    });
  }
  return ba;
};

/* =========================
 * Facturación
 * ========================= */
const createInvoice = async (raw, createdBy) => {
  const { error, value } = createInvoiceSchema.validate(raw, { abortEarly: false, stripUnknown: true });
  if (error) throw new Error(error.details.map((d) => d.message).join('; '));

  const {
    customerId,
    periodStart,
    periodEnd,
    items,
    tax = 0,
    discount = 0,
    notes,
    currency = DEFAULT_CURRENCY,
  } = value;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error('Cliente no encontrado');

  const billingAccount = await ensureBillingAccount(customerId);

  const { subtotal, total } = computeTotals(items, tax, discount);
  if (total <= 0) throw new Error('El total de la factura debe ser mayor a 0');

  const _periodStart = toDate(periodStart, 'periodStart');
  const _periodEnd = toDate(periodEnd, 'periodEnd');

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        customerId,
        billingAccountId: billingAccount.id,
        periodStart: _periodStart,
        periodEnd: _periodEnd,
        subtotal,
        tax: num(tax),
        discount: num(discount),
        total,
        balanceDue: total,
        issueDate: new Date(),
        dueDate: dayjs(_periodEnd).add(DUE_DAYS, 'day').toDate(),
        status: 'PENDING',
        notes,
        currency,
      },
    });

    await tx.invoiceItem.createMany({
      data: (items || []).map((it) => ({
        invoiceId: invoice.id,
        description: it.description,
        quantity: num(it.quantity),
        unitPrice: num(it.unitPrice),
        total: num(it.quantity) * num(it.unitPrice),
        planId: it.planId || null,
        ticketId: it.ticketId || null,
      })),
    });

    await tx.billingAccount.update({
      where: { id: billingAccount.id },
      data: { balance: { increment: total } },
    });

    await tx.ledgerEntry.create({
      data: {
        customerId,
        billingAccountId: billingAccount.id,
        type: 'DEBIT',
        amount: total,
        description: `Factura ${invoice.invoiceNumber || invoice.id}`,
        invoiceId: invoice.id,
        transactionDate: new Date(),
      },
    });

    return tx.invoice.findUnique({
      where: { id: invoice.id },
      include: { items: true },
    });
  });

  return result;
};

/* =========================
 * Reactivación de clientes
 * ========================= */
const reactivateCustomerIfCut = async (customerId) => {
  console.log(`🔄 Verificando si el cliente ${customerId} necesita reactivación...`);
  
  // Obtener cliente con sus planes activos y cuentas PPPoE
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      customerPlans: {
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
        take: 1,
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              mikrotikProfileName: true
            }
          }
        }
      },
      pppoeAccounts: {
        where: {
          active: true,
          deletedAt: null
        },
        include: {
          device: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  if (!customer) {
    console.log(`⚠️ Cliente ${customerId} no encontrado`);
    return;
  }

  // Verificar si tiene plan activo
  if (!customer.customerPlans || customer.customerPlans.length === 0) {
    console.log(`⚠️ Cliente ${customer.name} no tiene plan activo`);
    return;
  }

  const activePlan = customer.customerPlans[0];
  const planProfile = activePlan.plan?.mikrotikProfileName;

  if (!planProfile) {
    console.log(`⚠️ Plan ${activePlan.plan?.name} no tiene perfil MikroTik configurado`);
    return;
  }

  // Verificar si tiene cuentas PPPoE
  if (!customer.pppoeAccounts || customer.pppoeAccounts.length === 0) {
    console.log(`⚠️ Cliente ${customer.name} no tiene cuentas PPPoE activas`);
    return;
  }

  // Verificar si alguna cuenta está cortada
  const cutProfiles = ['CORTE MOROSO', 'CORTE', 'CUT', 'SUSPENDED'];
  const pppoeService = require('./pppoeService');
  let reactivatedCount = 0;

  for (const pppoeAccount of customer.pppoeAccounts) {
    const currentProfile = pppoeAccount.profile || '';
    const isCut = cutProfiles.some(cutProfile => 
      currentProfile.toUpperCase().includes(cutProfile.toUpperCase())
    );

    if (isCut) {
      console.log(`🔓 Cliente ${customer.name} (${pppoeAccount.username}) está cortado con perfil '${currentProfile}', reactivando a '${planProfile}'...`);
      
      try {
        await pppoeService.changeCustomerProfile(pppoeAccount.username, planProfile);
        reactivatedCount++;
        console.log(`✅ Cliente ${customer.name} (${pppoeAccount.username}) reactivado exitosamente`);
      } catch (error) {
        console.error(`❌ Error al reactivar cliente ${customer.name} (${pppoeAccount.username}):`, error.message);
        // Continuar con los demás clientes aunque uno falle
      }
    } else {
      console.log(`ℹ️ Cliente ${customer.name} (${pppoeAccount.username}) ya está activo con perfil '${currentProfile}'`);
    }
  }

  if (reactivatedCount > 0) {
    console.log(`✅ Reactivación completada: ${reactivatedCount} cuenta(s) reactivada(s) para el cliente ${customer.name}`);
  }
};

/* =========================
 * Pagos
 * ========================= */
const recordPayment = async (raw, createdBy) => {
  console.log('📦 Datos recibidos en billingService.recordPayment:', { raw, createdBy });

  const { error, value } = recordPaymentSchema.validate(raw, { abortEarly: false, stripUnknown: true });
  if (error) {
    console.error('❌ Error de validación:', error.details.map((d) => d.message).join('; '));
    throw new Error(error.details.map((d) => d.message).join('; '));
  }

  const {
    customerId,
    invoiceId,
    amount,
    paymentMethod,
    reference,
    paymentDate,
    notes,
    walletProvider,
  } = value;

  const ba = await ensureBillingAccount(customerId);

  let payment;
  let targetInvoice;

  // Transacción: crea el pago y actualiza saldos
  await prisma.$transaction(async (tx) => {
    targetInvoice = invoiceId ? await tx.invoice.findUnique({ where: { id: invoiceId } }) : null;

    if (invoiceId && !targetInvoice) throw new Error('Factura no encontrada');
    if (targetInvoice && num(amount) > num(targetInvoice.balanceDue)) {
      throw new Error(`El pago (${amount}) excede el saldo de la factura (${targetInvoice.balanceDue})`);
    }
    if (!invoiceId && num(amount) > num(ba.balance)) {
      throw new Error(`El pago (${amount}) excede el saldo de la cuenta (${ba.balance})`);
    }

    if (!targetInvoice) {
      // Crear una factura "contenedora" del pago (compatibilidad con tu flujo)
      targetInvoice = await tx.invoice.create({
        data: {
          customerId,
          billingAccountId: ba.id,
          periodStart: new Date(),
          periodEnd: new Date(),
          subtotal: num(amount),
          tax: 0,
          discount: 0,
          total: num(amount),
          balanceDue: num(amount),
          issueDate: new Date(),
          dueDate: dayjs().add(DUE_DAYS, 'day').toDate(),
          status: 'PENDING',
          currency: DEFAULT_CURRENCY,
          notes: 'Factura generada automáticamente por pago',
        },
      });

      await tx.invoiceItem.create({
        data: {
          invoiceId: targetInvoice.id,
          description: `Pago registrado el ${new Date().toLocaleDateString('es-PE')}`,
          quantity: 1,
          unitPrice: num(amount),
          total: num(amount),
        },
      });
    }

    // Construct reference with walletProvider if applicable
    let finalReference = reference;
    if (paymentMethod === 'DIGITAL_WALLET' && walletProvider) {
      finalReference = `${walletProvider}${reference ? ' - ' + reference : ''}`;
    }

    payment = await tx.payment.create({
      data: {
        customerId,
        billingAccountId: ba.id,
        invoiceId: targetInvoice.id,
        amount: num(amount),
        currency: DEFAULT_CURRENCY,
        paymentMethod,
        reference: finalReference,
        status: 'COMPLETED',
        paymentDate: toDate(paymentDate || new Date(), 'paymentDate'),
        processedDate: new Date(),
        notes,
        createdBy: createdBy || 'SYSTEM',
      },
    });

    const remaining = num(targetInvoice.balanceDue) - num(amount);
    let newStatus = targetInvoice.status;
    if (remaining === 0) newStatus = 'PAID';
    else if (remaining > 0 && remaining < num(targetInvoice.total)) newStatus = 'PARTIAL';

    await tx.invoice.update({
      where: { id: targetInvoice.id },
      data: { balanceDue: remaining, status: newStatus },
    });

    await tx.billingAccount.update({
      where: { id: ba.id },
      data: {
        balance: { decrement: num(amount) },
        lastPaymentDate: toDate(paymentDate || new Date(), 'paymentDate'),
      },
    });

    await tx.ledgerEntry.create({
      data: {
        customerId,
        billingAccountId: ba.id,
        type: 'CREDIT',
        amount: num(amount),
        description: `Pago ${payment.paymentNumber || payment.id} aplicado a ${targetInvoice.invoiceNumber || targetInvoice.id}`,
        invoiceId: targetInvoice.id,
        paymentId: payment.id,
        transactionDate: toDate(paymentDate || new Date(), 'paymentDate'),
      },
    });
  });

  // Fuera de la transacción: PDF + WhatsApp
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  const { filePath, fileName } = await generateInvoicePdf(targetInvoice.id);

  const receiptUrl = `/uploads/receipts/${safeName(customer?.name)}/${fileName}`;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { receiptUrl },
  });

  await sendWhatsAppWithDocument(
    customerId,
    `Pago registrado: S/ ${num(amount).toFixed(2)} (${payment.paymentNumber || payment.id}). Adjuntamos su recibo.`,
    filePath
  );

  // ✅ Reactivar cliente si está cortado
  try {
    await reactivateCustomerIfCut(customerId);
  } catch (reactivationError) {
    // No fallar el pago si la reactivación falla, solo loguear
    console.error(`⚠️ Error al intentar reactivar cliente ${customerId} después del pago:`, reactivationError.message);
  }

  return prisma.payment.findUnique({
    where: { id: payment.id },
    include: { invoice: true },
  });
};

/* =========================
 * Listados / Consultas
 * ========================= */
const listInvoices = async (rawQuery = {}) => {
  const { error, value } = listInvoicesSchema.validate(rawQuery, { stripUnknown: true });
  if (error) throw new Error(error.details.map((d) => d.message).join('; '));

  const { customerId, status, from, to, q } = value;

  return prisma.invoice.findMany({
    where: {
      customerId: customerId || undefined,
      status: status || undefined,
      issueDate: {
        gte: from ? toDate(from, 'from') : undefined,
        lte: to ? toDate(to, 'to') : undefined,
      },
      OR: q
        ? [
            { invoiceNumber: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
          ]
        : undefined,
    },
    orderBy: [{ issueDate: 'desc' }],
    include: { items: true, payments: true },
  });
};

const getInvoiceById = async (id) => {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, payments: true },
  });
  if (!inv) throw new Error('Factura no encontrada');
  return inv;
};

const listPayments = async (rawQuery = {}) => {
  const { error, value } = listPaymentsSchema.validate(rawQuery, { stripUnknown: true });
  if (error) throw new Error(error.details.map((d) => d.message).join('; '));

  const { customerId, from, to, method } = value;

  return prisma.payment.findMany({
    where: {
      customerId: customerId || undefined,
      paymentMethod: method || undefined,
      paymentDate: {
        gte: from ? toDate(from, 'from') : undefined,
        lte: to ? toDate(to, 'to') : undefined,
      },
    },
    orderBy: [{ paymentDate: 'desc' }],
    include: { invoice: true },
  });
};

const getBillingAccount = async (customerId) => {
  const ba = await prisma.billingAccount.findUnique({
    where: { customerId },
    include: { invoices: true, payments: true, ledgerEntries: true },
  });
  if (!ba) return ensureBillingAccount(customerId);
  return ba;
};

const updateBillingAccount = async (customerId, raw) => {
  const { error, value } = updateBillingAccountSchema.validate(raw, { stripUnknown: true });
  if (error) throw new Error(error.details.map((d) => d.message).join('; '));

  await ensureBillingAccount(customerId);
  return prisma.billingAccount.update({
    where: { customerId },
    data: value,
  });
};

const listBillingAccounts = async (filters = {}) => {
  const { error, value } = listBillingAccountsSchema.validate(filters, { stripUnknown: true });
  if (error) throw new Error(error.details.map((d) => d.message).join('; '));

  const { status } = value;
  return prisma.billingAccount.findMany({
    where: {
      balance:
        status === 'pending'
          ? { gt: 0 }
          : status === 'up-to-date'
          ? { equals: 0 }
          : undefined,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          customerPlans: {
            where: { status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            take: 1,
            select: { plan: { select: { name: true, monthlyPrice: true } } },
          }
        }
      },
    },
    orderBy: [{ customer: { name: 'asc' } }],
  });
};

/* =========================
 * Facturación Recurrente Mensual
 * ========================= */
/**
 * Genera facturas mensuales para clientes con planes activos.
 * - Periodo: mes en curso [startOf('month') .. endOf('month')]
 * - Se ejecuta el día 25 de cada mes para facturar ese mes
 * - Ejemplo: El 25 de diciembre genera facturas de diciembre
 * - Evita doble facturación del período (busca factura existente por overlap de fechas)
 * - Aplica crédito a favor (balance negativo) como "discount" en la factura
 * - dueDate = periodEnd + 7 días (lo gestiona createInvoice)
 */
const generateMonthlyDebt = async () => {
  // Usar zona horaria de Lima para asegurar que el mes se calcule correctamente
  const now = dayjs().tz(LIMA_TZ);
  const periodStart = now.startOf('month').toDate();
  const periodEnd = now.endOf('month').toDate();
  const humanMonth = now.format('MMMM YYYY'); // p.ej. "diciembre 2025"
  
  console.log(`📅 Generando deuda para: ${humanMonth}`);
  console.log(`📅 Periodo: ${dayjs(periodStart).tz(LIMA_TZ).format('DD/MM/YYYY')} - ${dayjs(periodEnd).tz(LIMA_TZ).format('DD/MM/YYYY')}`);

  // Traer clientes con al menos un plan activo
  const customers = await prisma.customer.findMany({
    where: {
      status: 'ACTIVE',
      customerPlans: { some: { status: 'ACTIVE' } },
    },
    include: {
      customerPlans: {
        where: { status: 'ACTIVE' },
        include: { plan: true },
      },
    },
  });

  const results = [];

  for (const customer of customers) {
    // Asegura BA y lee balance
    const ba = await ensureBillingAccount(customer.id);

    // Calcular total de planes con prorrateo
    let totalPlans = 0;
    const planItems = [];
    
    console.log(`📊 Calculando deuda para cliente: ${customer.name}`);
    
    for (const cp of customer.customerPlans || []) {
      const planPrice = num(cp.plan?.monthlyPrice);
      
      // Calcular prorrateo basado en cuándo se activó el plan
      // Usar zona horaria de Lima para consistencia
      const planStartDate = dayjs(cp.startDate).tz(LIMA_TZ);
      const monthStart = dayjs().tz(LIMA_TZ).startOf('month');
      const monthEnd = dayjs().tz(LIMA_TZ).endOf('month');
      
      console.log(`  📅 Plan: ${cp.plan?.name} - Precio: S/${planPrice}`);
      console.log(`  📅 Fecha activación: ${planStartDate.format('DD/MM/YYYY')}`);
      console.log(`  📅 Mes actual: ${monthStart.format('DD/MM/YYYY')} - ${monthEnd.format('DD/MM/YYYY')}`);
      
      // Si el plan se activó antes del inicio del mes, cobrar mes completo
      if (planStartDate.isBefore(monthStart)) {
        totalPlans += planPrice;
        planItems.push({
          description: `Plan ${cp.plan?.name || 's/n'} - ${humanMonth} (mes completo)`,
          quantity: 1,
          unitPrice: planPrice,
          planId: cp.planId,
        });
        console.log(`  ✅ Mes completo: S/${planPrice}`);
      } else {
        // Calcular prorrateo desde la fecha de activación hasta fin de mes
        const daysInMonth = monthEnd.daysInMonth();
        const daysUsed = monthEnd.diff(planStartDate, 'day') + 1;
        const proratedAmount = (planPrice / daysInMonth) * daysUsed;
        
        totalPlans += proratedAmount;
        planItems.push({
          description: `Plan ${cp.plan?.name || 's/n'} - ${humanMonth} (${daysUsed} días)`,
          quantity: 1,
          unitPrice: proratedAmount,
          planId: cp.planId,
        });
        console.log(`  📊 Prorrateo: ${daysUsed} días de ${daysInMonth} = S/${proratedAmount.toFixed(2)}`);
      }
    }
    
    console.log(`  💰 Total calculado: S/${totalPlans.toFixed(2)}`);

    // Crédito disponible (balance negativo => crédito positivo)
    const creditBalance = Math.abs(Math.min(0, num(ba.balance)));
    const discount = Math.min(creditBalance, totalPlans);

    // Si después del crédito no hay importe, omite
    const finalAmount = Math.max(0, totalPlans - discount);
    if (finalAmount <= 0) {
      results.push({
        customerId: customer.id,
        customerName: customer.name,
        status: 'SKIPPED_NO_CHARGE',
        reason: 'Crédito cubre la totalidad o no hay cargos de planes',
      });
      continue;
    }

    // Evitar doble facturación del período usando overlap del rango
    const existing = await prisma.invoice.findFirst({
      where: {
        customerId: customer.id,
        // Cualquier factura cuya ventana [periodStart..periodEnd] se superponga con la del mes
        AND: [
          { periodStart: { lte: periodEnd } },
          { periodEnd: { gte: periodStart } },
        ],
        // Opcional: si manejas estados "CANCELLED/VOID", exclúyelos:
        // NOT: { status: { in: ['VOID', 'CANCELLED'] }},
      },
      select: { id: true, invoiceNumber: true, status: true, issueDate: true },
    });

    if (existing) {
      results.push({
        customerId: customer.id,
        customerName: customer.name,
        status: 'SKIPPED_ALREADY_BILLED',
        invoiceId: existing.id,
        invoiceNumber: existing.invoiceNumber,
      });
      continue;
    }

    // Usar los ítems calculados con prorrateo
    const items = planItems;

    // Crear factura con descuento = crédito aplicado
    const invoice = await createInvoice(
      {
        customerId: customer.id,
        periodStart,
        periodEnd,
        items,
        tax: 0,
        discount,
        notes: `Servicio mensual - ${humanMonth}`,
        currency: DEFAULT_CURRENCY,
      },
      'SYSTEM_MONTHLY_BILLING'
    );

    results.push({
      customerId: customer.id,
      customerName: customer.name,
      status: 'BILLED',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      discount,
    });
  }

  return results;
};

// Eliminar un pago regular
const deletePayment = async (paymentId) => {
  console.log('🗑️ Eliminando pago:', paymentId);
  
  // Buscar el pago con sus relaciones
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: true,
      customer: {
        include: {
          billingAccount: true
        }
      }
    }
  });

  if (!payment) {
    throw new Error('Pago no encontrado');
  }

  if (payment.status !== 'COMPLETED') {
    throw new Error('Solo se pueden eliminar pagos completados');
  }

  // Eliminar el pago y revertir los cambios en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // Revertir el saldo de la cuenta de facturación
    await tx.billingAccount.update({
      where: { id: payment.billingAccountId },
      data: {
        balance: {
          increment: payment.amount
        }
      }
    });

    // Revertir el estado de la factura
    const newBalanceDue = num(payment.invoice.balanceDue) + num(payment.amount);
    let newStatus = payment.invoice.status;
    
    if (newBalanceDue >= num(payment.invoice.total)) {
      newStatus = 'PENDING';
    } else if (newBalanceDue > 0) {
      newStatus = 'PARTIAL';
    }

    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        balanceDue: newBalanceDue,
        status: newStatus
      }
    });

    // Crear entrada en el ledger para revertir
    await tx.ledgerEntry.create({
      data: {
        customerId: payment.customerId,
        billingAccountId: payment.billingAccountId,
        type: 'DEBIT',
        amount: payment.amount,
        description: `Pago eliminado - ${payment.paymentNumber || payment.id}`,
        invoiceId: payment.invoiceId,
        paymentId: payment.id,
        transactionDate: new Date()
      }
    });

    // Eliminar el pago
    await tx.payment.delete({
      where: { id: paymentId }
    });

    return payment;
  });

  console.log('✅ Pago eliminado:', paymentId);
  return result;
};

/* =========================
 * Exports
 * ========================= */
module.exports = {
  createInvoice,
  recordPayment,
  listInvoices,
  getInvoiceById,
  listPayments,
  getBillingAccount,
  updateBillingAccount,
  listBillingAccounts,
  generateMonthlyDebt, // NUEVO
  deletePayment, // NUEVO
};


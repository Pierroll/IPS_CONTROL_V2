// billingService.js
/* eslint-disable no-console */
const prisma = require('../models/prismaClient');
const dayjs = require('dayjs');
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
    discount = 0,
    paymentMethod,
    reference,
    paymentDate,
    notes,
    walletProvider,
  } = value;

  // Calcular monto final después del descuento
  const discountAmount = num(discount) || 0;
  const finalAmount = Math.max(0, num(amount) - discountAmount);
  
  if (finalAmount <= 0) {
    throw new Error('El monto final después del descuento debe ser mayor a 0');
  }

  const ba = await ensureBillingAccount(customerId);

  let payment;
  let targetInvoice;

  // Transacción: crea el pago y actualiza saldos
  await prisma.$transaction(async (tx) => {
    targetInvoice = invoiceId ? await tx.invoice.findUnique({ where: { id: invoiceId } }) : null;

    if (invoiceId && !targetInvoice) throw new Error('Factura no encontrada');
    if (targetInvoice && num(finalAmount) > num(targetInvoice.balanceDue)) {
      throw new Error(`El pago (${finalAmount}) excede el saldo de la factura (${targetInvoice.balanceDue})`);
    }
    if (!invoiceId && num(finalAmount) > num(ba.balance)) {
      throw new Error(`El pago (${finalAmount}) excede el saldo de la cuenta (${ba.balance})`);
    }

    if (!targetInvoice) {
      // Crear una factura "contenedora" del pago (compatibilidad con tu flujo)
      // El balanceDue debe ser el amount original, no el finalAmount
      // porque el descuento se aplica al momento del pago
      targetInvoice = await tx.invoice.create({
        data: {
          customerId,
          billingAccountId: ba.id,
          periodStart: new Date(),
          periodEnd: new Date(),
          subtotal: num(amount),
          tax: 0,
          discount: discountAmount,
          total: num(amount), // Total es el monto original
          balanceDue: num(amount), // BalanceDue inicial es el monto original
          issueDate: new Date(),
          dueDate: dayjs().add(DUE_DAYS, 'day').toDate(),
          status: 'PENDING',
          currency: DEFAULT_CURRENCY,
          notes: discountAmount > 0 
            ? `Factura generada automáticamente por pago. Descuento aplicado: S/ ${discountAmount.toFixed(2)}`
            : 'Factura generada automáticamente por pago',
        },
      });

      await tx.invoiceItem.create({
        data: {
          invoiceId: targetInvoice.id,
          description: discountAmount > 0
            ? `Pago registrado el ${new Date().toLocaleDateString('es-PE')} (Descuento: S/ ${discountAmount.toFixed(2)})`
            : `Pago registrado el ${new Date().toLocaleDateString('es-PE')}`,
          quantity: 1,
          unitPrice: num(amount),
          total: num(amount), // Total del item es el monto original
        },
      });
    }

    // Construct reference with walletProvider if applicable
    let finalReference = reference;
    if (paymentMethod === 'DIGITAL_WALLET' && walletProvider) {
      finalReference = `${walletProvider}${reference ? ' - ' + reference : ''}`;
    }

    // Construir notas con información del descuento si aplica
    let paymentNotes = notes || '';
    if (discountAmount > 0) {
      paymentNotes = paymentNotes 
        ? `${paymentNotes}\nDescuento aplicado: S/ ${discountAmount.toFixed(2)}`
        : `Descuento aplicado: S/ ${discountAmount.toFixed(2)}`;
    }

    payment = await tx.payment.create({
      data: {
        customerId,
        billingAccountId: ba.id,
        invoiceId: targetInvoice.id,
        amount: num(finalAmount), // Usar el monto final después del descuento
        currency: DEFAULT_CURRENCY,
        paymentMethod,
        reference: finalReference,
        status: 'COMPLETED',
        paymentDate: toDate(paymentDate || new Date(), 'paymentDate'),
        processedDate: new Date(),
        notes: paymentNotes,
        createdBy: createdBy || 'SYSTEM',
      },
    });

    // Calcular el remaining: si hay descuento, el balanceDue se reduce por el amount original
    // porque el descuento es una reducción del monto a pagar, pero el balance debe quedar en 0
    const remaining = discountAmount > 0 
      ? num(targetInvoice.balanceDue) - num(amount) // Si hay descuento, reducir por el monto original
      : num(targetInvoice.balanceDue) - num(finalAmount); // Si no hay descuento, reducir por el monto final
    
    let newStatus = targetInvoice.status;
    if (remaining === 0) newStatus = 'PAID';
    else if (remaining > 0 && remaining < num(targetInvoice.total)) newStatus = 'PARTIAL';

    await tx.invoice.update({
      where: { id: targetInvoice.id },
      data: { balanceDue: remaining, status: newStatus },
    });

    // El balance de la cuenta debe reducirse por el amount original (no el finalAmount)
    // porque el descuento es una reducción del monto a pagar, pero la deuda se cancela completamente
    await tx.billingAccount.update({
      where: { id: ba.id },
      data: {
        balance: { decrement: num(amount) }, // Reducir por el monto original, no el final
        lastPaymentDate: toDate(paymentDate || new Date(), 'paymentDate'),
      },
    });

    await tx.ledgerEntry.create({
      data: {
        customerId,
        billingAccountId: ba.id,
        type: 'CREDIT',
        amount: num(finalAmount), // Usar el monto final después del descuento
        description: discountAmount > 0
          ? `Pago ${payment.paymentNumber || payment.id} aplicado a ${targetInvoice.invoiceNumber || targetInvoice.id} (Descuento: S/ ${discountAmount.toFixed(2)})`
          : `Pago ${payment.paymentNumber || payment.id} aplicado a ${targetInvoice.invoiceNumber || targetInvoice.id}`,
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

  // ✅ Intentar enviar WhatsApp, pero no fallar el pago si falla
  let whatsappSent = false;
  let whatsappError = null;
  try {
    await sendWhatsAppWithDocument(
      customerId,
      `Pago registrado: S/ ${num(amount).toFixed(2)} (${payment.paymentNumber || payment.id}). Adjuntamos su recibo.`,
      filePath
    );
    whatsappSent = true;
    console.log(`✅ Mensaje de WhatsApp enviado exitosamente para el pago ${payment.paymentNumber || payment.id}`);
  } catch (error) {
    // No fallar el pago si el envío de WhatsApp falla, solo loguear y guardar el error
    whatsappSent = false;
    whatsappError = error.message || 'Error desconocido al enviar mensaje';
    console.error(`⚠️ Error al enviar mensaje de WhatsApp para el pago ${payment.paymentNumber || payment.id}:`, whatsappError);
    
    // Registrar el error en el log de mensajes
    try {
      const phone = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { phone: true },
      });
      
      await prisma.messageLog.create({
        data: {
          customerId,
          invoiceId: targetInvoice.id,
          channel: 'WHATSAPP',
          messageType: 'PAYMENT_REMINDER',
          content: `Pago registrado: S/ ${num(amount).toFixed(2)} (${payment.paymentNumber || payment.id}). Adjuntamos su recibo.`,
          status: 'FAILED',
          errorMessage: whatsappError,
          phoneNumber: phone?.phone || null,
        },
      });
    } catch (logError) {
      console.error(`⚠️ Error al registrar el fallo de WhatsApp en messageLog:`, logError.message);
    }
  }

  // ✅ Reactivar cliente si está cortado
  try {
    await reactivateCustomerIfCut(customerId);
  } catch (reactivationError) {
    // No fallar el pago si la reactivación falla, solo loguear
    console.error(`⚠️ Error al intentar reactivar cliente ${customerId} después del pago:`, reactivationError.message);
  }

  const paymentResult = await prisma.payment.findUnique({
    where: { id: payment.id },
    include: { invoice: true },
  });

  // Agregar información sobre el envío de WhatsApp al resultado
  paymentResult.whatsappSent = whatsappSent;
  if (!whatsappSent && whatsappError) {
    paymentResult.whatsappError = whatsappError;
  }

  return paymentResult;
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
    include: { 
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
        }
      },
      customer: {
        select: {
          id: true,
          name: true,
          code: true,
        }
      },
      creator: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    // El campo 'status' se incluye automáticamente ya que es parte del modelo Payment
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
 * - Evita doble facturación del período (busca factura existente por overlap de fechas)
 * - Aplica crédito a favor (balance negativo) como "discount" en la factura
 * - dueDate = periodEnd + 7 días (lo gestiona createInvoice)
 */
const generateMonthlyDebt = async () => {
  const periodStart = dayjs().startOf('month').toDate();
  const periodEnd = dayjs().endOf('month').toDate();
  const humanMonth = dayjs(periodStart).format('MMMM YYYY'); // p.ej. "octubre 2025"

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
      const planStartDate = dayjs(cp.startDate);
      const monthStart = dayjs().startOf('month');
      const monthEnd = dayjs().endOf('month');
      
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

// Anular un pago (marcar como anulado pero mantener el registro)
const voidPayment = async (paymentId, reason) => {
  console.log('🚫 Anulando pago:', paymentId, 'Razón:', reason);
  
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

  if (payment.status === 'CANCELLED') {
    throw new Error('El pago ya está anulado');
  }

  if (payment.status !== 'COMPLETED') {
    throw new Error('Solo se pueden anular pagos completados');
  }

  // Anular el pago y revertir los cambios en una transacción
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

    // Revertir el estado de la factura si existe
    if (payment.invoiceId && payment.invoice) {
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
    }

    // Crear entrada en el ledger para registrar la anulación
    await tx.ledgerEntry.create({
      data: {
        customerId: payment.customerId,
        billingAccountId: payment.billingAccountId,
        type: 'DEBIT',
        amount: payment.amount,
        description: `Pago anulado - ${payment.paymentNumber || payment.id}${reason ? ` - Razón: ${reason}` : ''}`,
        invoiceId: payment.invoiceId,
        paymentId: payment.id,
        transactionDate: new Date()
      }
    });

    // Marcar el pago como anulado (no eliminarlo)
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CANCELLED',
        notes: payment.notes 
          ? `${payment.notes}\n[ANULADO] ${reason || 'Sin razón especificada'} - ${new Date().toLocaleString('es-PE')}`
          : `[ANULADO] ${reason || 'Sin razón especificada'} - ${new Date().toLocaleString('es-PE')}`
      }
    });

    return updatedPayment;
  });

  console.log('✅ Pago anulado:', paymentId);
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
  deletePayment,
  voidPayment,
};


// backend/src/services/customerPlanService.js
const prisma = require('../models/prismaClient');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(tz);

const {
  createCustomerPlanSchema,
  updateCustomerPlanSchema,
} = require('../validations/customerPlanValidation');

const notificationService = require('./notificationService');

// === Config ===
const BUSINESS_TZ = 'America/Lima';

// A medianoche de Lima -> Date UTC, para que no “salte” un día en UI
// backend/src/services/customerPlanService.js
const toUtcFromLocalMidnight = (d) => {
  console.log('toUtcFromLocalMidnight input:', d);
  if (!d) {
    console.error('Fecha de entrada vacía o nula:', d);
    throw new Error('La fecha de entrada no puede estar vacía');
  }
  const parsedDate = dayjs.tz(d, BUSINESS_TZ).startOf('day');
  if (!parsedDate.isValid()) {
    console.error('Fecha inválida en toUtcFromLocalMidnight:', d);
    throw new Error('La fecha proporcionada no es válida');
  }
  const result = parsedDate.utc().toDate();
  console.log('toUtcFromLocalMidnight output:', result);
  return result;
};

// Normaliza a solo 2 estados: ACTIVE | INACTIVE
const normalizeStatus = (s) => {
  if (s === 'ACTIVE') return 'ACTIVE';
  if (s === 'SUSPENDED') return 'SUSPENDED';
  return 'INACTIVE';
};

// Cobra prorrateo del NUEVO plan desde baseStart (medianoche)
const computeProrate = (planMonthlyPrice, baseStart) => {
  const start = dayjs(baseStart);
  const endOfMonth = start.endOf('month');
  const daysInMonth = start.daysInMonth();
  const daysUsed = endOfMonth.diff(start, 'day') + 1;

  const fullMonth = start.date() === 1;
  const amount = fullMonth
    ? Number(planMonthlyPrice)
    : (Number(planMonthlyPrice) / daysInMonth) * daysUsed;

  const description = fullMonth
    ? `Mes completo para ${Number(planMonthlyPrice).toFixed(2)}`
    : `Prorrateo (${daysUsed} días)`;

  return { amount, daysUsed, fullMonth, description };
};

// Aplica cargo a cuenta y crea recibo interno
const applyServiceCharge = async (tx, customerId, amount, concept, createdBy) => {
  await tx.internalReceipt.create({
    data: {
      amount,
      description: concept,
      receiptType: 'SERVICE',
      creator: { connect: { id: createdBy } },
      customer: { connect: { id: customerId } },
    },
  });

  await tx.billingAccount.upsert({
    where: { customerId },
    create: {
      customerId,
      balance: amount,
      creditLimit: 500.0,
      status: 'ACTIVE',
      billingCycle: 1,
      autoSuspend: true,
    },
    update: { balance: { increment: amount } },
  });
};

const createCustomerPlan = async (raw, changedBy) => {
  console.log('createCustomerPlan payload:', JSON.stringify(raw, null, 2));
  const { error } = createCustomerPlanSchema.validate(raw, { abortEarly: false });
  if (error) {
    console.error('Errores de validación:', JSON.stringify(error.details, null, 2));
    throw new Error(error.details.map((d) => d.message).join('; '));
  }

  const data = { ...raw };
  const finalStatus = normalizeStatus(data.status || 'ACTIVE');

  // Validaciones base
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new Error('Cliente no encontrado');

  const plan = await prisma.plan.findUnique({
    where: { id: data.planId, deletedAt: null },
    select: { id: true, name: true, monthlyPrice: true },
  });
  if (!plan) throw new Error('Plan no encontrado');

  // Fechas normalizadas
  let startDate;
  try {
    startDate = toUtcFromLocalMidnight(data.startDate);
  } catch (err) {
    console.error('Error al procesar startDate:', err.message, 'Input:', data.startDate);
    throw new Error('La fecha de inicio no es válida');
  }

  let endDate = null;
  if (data.endDate) {
    try {
      endDate = toUtcFromLocalMidnight(data.endDate);
    } catch (err) {
      console.error('Error al procesar endDate:', err.message, 'Input:', data.endDate);
      throw new Error('La fecha de fin no es válida');
    }
  }

  // Si existe una asignación NO cancelada
  const existing = await prisma.customerPlan.findFirst({
    where: { customerId: data.customerId, status: { in: ['ACTIVE', 'INACTIVE'] } },
    include: { plan: { select: { name: true, monthlyPrice: true } } },
    orderBy: [{ updatedAt: 'desc' }],
  });

  return prisma.$transaction(async (tx) => {
    let updatedOrCreated;

    if (existing) {
      // Update sobre la última asignación no cancelada
      updatedOrCreated = await tx.customerPlan.update({
        where: { id: existing.id },
        data: {
          planId: data.planId || existing.planId,
          status: finalStatus,
          startDate,
          endDate,
          changeType:
            data.changeType || (finalStatus === 'ACTIVE' ? 'REACTIVATION' : 'SUSPENSION'),
          changeReason: data.changeReason ?? existing.changeReason,
          notes: data.notes ?? existing.notes,
          changedBy: changedBy ?? existing.changedBy,
        },
        include: {
          customer: { select: { name: true } },
          plan: { select: { name: true, monthlyPrice: true } },
        },
      });

      // Si queda ACTIVO, desactivar otros activos del mismo cliente
      if (finalStatus === 'ACTIVE') {
        await tx.customerPlan.updateMany({
          where: {
            customerId: updatedOrCreated.customerId,
            id: { not: updatedOrCreated.id },
            status: 'ACTIVE',
          },
          data: { status: 'INACTIVE' },
        });
      }

      // Si cambió de plan y está ACTIVO => prorrateo + (posible) recordatorio
      const changedPlan = data.planId && data.planId !== existing.planId;
      if (finalStatus === 'ACTIVE' && changedPlan) {
        const { amount, description } = computeProrate(plan.monthlyPrice, startDate);

        await applyServiceCharge(
          tx,
          data.customerId,
          amount,
          `Cambio de plan a ${plan.name} - ${description}`,
          changedBy
        );

        const baseStart = dayjs(startDate);
        const daysToEndOfMonth = baseStart.endOf('month').diff(baseStart, 'day');
        if (daysToEndOfMonth <= 5) {
          await notificationService.sendPaymentReminder(
            data.customerId,
            `Deuda inmediata: S/ ${amount.toFixed(
              2
            )} por cambio de plan a ${plan.name}. Pague antes del 1ero para evitar suspensión.`
          );
        }
      }

      return updatedOrCreated;
    }

    // Create
    updatedOrCreated = await tx.customerPlan.create({
      data: {
        customerId: data.customerId,
        planId: data.planId,
        status: finalStatus,
        startDate,
        endDate,
        changeType: data.changeType || 'NEW',
        changeReason: data.changeReason || null,
        notes: data.notes || null,
        changedBy,
      },
      include: {
        customer: { select: { name: true } },
        plan: { select: { name: true, monthlyPrice: true } },
      },
    });

    // Cargo inicial si queda ACTIVO
    if (finalStatus === 'ACTIVE') {
      const { amount, description } = computeProrate(plan.monthlyPrice, startDate);
      await applyServiceCharge(
        tx,
        data.customerId,
        amount,
        `Alta de ${plan.name} - ${description}`,
        changedBy
      );

      // (Opcional) recordatorio si faltan pocos días (dejado comentado)
      // const baseStart = dayjs(startDate);
      // const daysToEndOfMonth = baseStart.endOf('month').diff(baseStart, 'day');
      // if (daysToEndOfMonth <= 5) {
      //   await notificationService.sendPaymentReminder(
      //     data.customerId,
      //     `Deuda inmediata: S/ ${amount.toFixed(2)} por ${plan.name}. Pague antes del 1ero para evitar suspensión.`
      //   );
      // }
    }

    // Asegurar unicidad de activo por cliente
    if (finalStatus === 'ACTIVE') {
      await tx.customerPlan.updateMany({
        where: {
          customerId: data.customerId,
          id: { not: updatedOrCreated.id },
          status: 'ACTIVE',
        },
        data: { status: 'INACTIVE' },
      });
    }

    return updatedOrCreated;
  });
};

const getCustomerPlans = async (filters = {}) => {
  const { customerId, planId, status } = filters;
  const normalized = status ? normalizeStatus(status) : undefined;

  return prisma.customerPlan.findMany({
    where: {
      status: normalized || undefined,
      customerId: customerId || undefined,
      planId: planId || undefined,
    },
    include: {
      customer: { select: { name: true } },
      plan: { select: { name: true, monthlyPrice: true } },
    },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  });
};

const getCustomerPlanById = async (id) => {
  const row = await prisma.customerPlan.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true } },
      plan: { select: { name: true, monthlyPrice: true } },
    },
  });
  if (!row) throw new Error('Asignación no encontrada');
  return row;
};

// backend/src/services/customerPlanService.js
const updateCustomerPlan = async (id, raw, changedBy) => {
  console.log('=== UPDATE CUSTOMER PLAN ===');
  console.log('ID:', id);
  console.log('Raw payload:', JSON.stringify(raw, null, 2));
  console.log('ChangedBy:', changedBy);

  // 1) Validación
  const { error } = updateCustomerPlanSchema.validate(raw, {
    abortEarly: false,
    stripUnknown: true, // Ignora campos no definidos en el schema
  });

  if (error) {
    console.error('❌ Error de validación:', error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message,
      type: d.type,
    })));
    const validationError = new Error('Errores de validación en la solicitud');
    validationError.status = 400;
    validationError.details = error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    throw validationError;
  }

  // 2) Buscar registro actual
  const current = await prisma.customerPlan.findUnique({
    where: { id },
    include: {
      plan: { select: { id: true, name: true, monthlyPrice: true } },
      customer: { select: { id: true, name: true } },
    },
  });

  if (!current) {
    console.error('❌ customerPlan no encontrado:', { id });
    const notFoundError = new Error('Asignación no encontrada');
    notFoundError.status = 404;
    throw notFoundError;
  }

  console.log('Current plan:', {
    planId: current.planId,
    status: current.status,
    startDate: current.startDate,
    endDate: current.endDate,
  });

  // 3) Normalización de fechas
  let newStart = undefined;
  if (raw.startDate) {
    try {
      const dateStr = typeof raw.startDate === 'string'
        ? raw.startDate
        : raw.startDate.toISOString();
      newStart = toUtcFromLocalMidnight(dateStr);
      console.log('✓ startDate procesado:', newStart);
    } catch (err) {
      console.error('❌ Error procesando startDate:', { error: err.message, input: raw.startDate });
      const dateError = new Error(`Fecha de inicio inválida: ${raw.startDate}`);
      dateError.status = 400;
      throw dateError;
    }
  }

  let newEnd = undefined;
  if (raw.endDate) {
    try {
      const dateStr = typeof raw.endDate === 'string'
        ? raw.endDate
        : raw.endDate.toISOString();
      newEnd = toUtcFromLocalMidnight(dateStr);
      console.log('✓ endDate procesado:', newEnd);
    } catch (err) {
      console.error('❌ Error procesando endDate:', { error: err.message, input: raw.endDate });
      const dateError = new Error(`Fecha de fin inválida: ${raw.endDate}`);
      dateError.status = 400;
      throw dateError;
    }
  }

  // 4) Normalizar status
  const finalStatus = raw.status ? normalizeStatus(raw.status) : current.status;

  // 5) Transacción
  return prisma.$transaction(async (tx) => {
    // Construir payload base
    const updateData = {
      planId: raw.planId || current.planId,
      status: finalStatus,
      changeReason: raw.changeReason ?? current.changeReason,
      notes: raw.notes ?? current.notes,
      changedBy: changedBy || current.changedBy,
    };

    // Solo actualizar fechas si fueron proporcionadas
    if (newStart !== undefined) updateData.startDate = newStart;
    if (newEnd !== undefined) updateData.endDate = newEnd;

    // Determinar changeType si no se proporciona
    const planChanged = raw.planId && raw.planId !== current.planId;

    if (!raw.changeType) {
      if (finalStatus === 'ACTIVE' && current.status !== 'ACTIVE') {
        updateData.changeType = 'REACTIVATION';
      } else if (finalStatus !== 'ACTIVE' && current.status === 'ACTIVE') {
        updateData.changeType = 'SUSPENSION';
      } else if (planChanged) {
        updateData.changeType = 'LATERAL'; // Cambiará después si detecta upgrade/downgrade
      }
    }
    else {
      updateData.changeType = raw.changeType;
    }

    // Reglas especiales para ACTIVE
    if (finalStatus === 'ACTIVE') {
      updateData.endDate = null;
      if (!updateData.startDate) {
        updateData.startDate = newStart || current.startDate;
      }
    }

    console.log('📤 Payload final para Prisma:', JSON.stringify(updateData, null, 2));

    // Ejecutar update
    const updated = await tx.customerPlan.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true, monthlyPrice: true } },
      },
    });

    console.log('✅ CustomerPlan actualizado:', updated.id);

    // Desactivar otros planes si este es ACTIVE
    if (updated.status === 'ACTIVE') {
      const deactivated = await tx.customerPlan.updateMany({
        where: {
          customerId: updated.customerId,
          id: { not: updated.id },
          status: 'ACTIVE',
        },
        data: { status: 'INACTIVE' },
      });
      console.log(`✓ ${deactivated.count} planes desactivados`);
    }

    // Aplicar prorrateo si cambió el plan y está activo
    if (planChanged && updated.status === 'ACTIVE') {
      console.log('Verificando nuevo plan:', updated.planId);
      const newPlan = await tx.plan.findUnique({
        where: { id: updated.planId, deletedAt: null },
      });

      if (!newPlan) {
        console.error('❌ Nuevo plan no encontrado:', updated.planId);
        const planError = new Error('El plan seleccionado no existe o fue eliminado');
        planError.status = 404;
        throw planError;
      }

      console.log('✓ Nuevo plan encontrado:', JSON.stringify(newPlan, null, 2));

      const baseStart = dayjs(updateData.startDate || current.startDate);
      console.log('Calculando prorrateo:', { monthlyPrice: newPlan.monthlyPrice, baseStart: baseStart.toDate() });
      const { amount, description } = computeProrate(newPlan.monthlyPrice, baseStart.toDate());
      console.log('✓ Prorrateo calculado:', { amount, description });

      console.log('Aplicando cargo de servicio:', { customerId: updated.customerId, amount, description });
      await applyServiceCharge(
        tx,
        updated.customerId,
        amount,
        `Cambio de plan a ${newPlan.name} - ${description}`,
        changedBy || current.changedBy
      );
      console.log('✓ Cargo de servicio aplicado');

      const daysToEndOfMonth = baseStart.endOf('month').diff(baseStart, 'day');
      if (daysToEndOfMonth <= 5) {
        console.log('Enviando recordatorio de pago:', { customerId: updated.customerId, amount });
        //await notificationService.sendPaymentReminder(
          //updated.customerId,
          `Deuda inmediata: S/ ${amount.toFixed(2)} por cambio de plan a ${newPlan.name}. Pague antes del 1° para evitar suspensión.`
        //);
        console.log('✓ Recordatorio de pago enviado');
      }
    }

    return updated;
  });
};

const deleteCustomerPlan = async (id) => {
  const row = await prisma.customerPlan.findUnique({ where: { id } });
  if (!row) throw new Error('Asignación no encontrada');

  return prisma.customerPlan.update({
    where: { id },
    data: { status: 'INACTIVE', changeType: 'SUSPENSION' },
    include: {
      customer: { select: { name: true } },
      plan: { select: { name: true } },
    },
  });
};

module.exports = {
  createCustomerPlan,
  getCustomerPlans,
  getCustomerPlanById,
  updateCustomerPlan,
  deleteCustomerPlan,
};

// backend/src/services/paymentCommitmentService.js
const prisma = require('../models/prismaClient');
const dayjs = require('dayjs');
const pppoeService = require('./pppoeService');
const billingService = require('./billingService');
const notificationService = require('./notificationService');

/**
 * Crear o actualizar un compromiso de pago
 * @param {string} customerId - ID del cliente
 * @param {Date} commitmentDate - Fecha límite del compromiso
 * @param {string} notes - Notas sobre el compromiso
 * @param {string} createdBy - ID del usuario que crea el compromiso
 * @returns {Promise<Object>} BillingAccount actualizado
 */
const createOrUpdatePaymentCommitment = async (customerId, commitmentDate, notes, createdBy) => {
  console.log(`📝 Creando/actualizando compromiso de pago para cliente ${customerId}`);
  
  // Validar que el cliente existe
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { billingAccount: true }
  });

  if (!customer) {
    throw new Error('Cliente no encontrado');
  }

  if (!customer.billingAccount) {
    throw new Error('El cliente no tiene una cuenta de facturación');
  }

  // Verificar que los campos de compromiso existen en la BD
  // Si no existen, lanzar error informativo
  try {
    await prisma.$queryRaw`SELECT payment_commitment_date FROM billing_accounts LIMIT 1`;
  } catch (error) {
    if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
      throw new Error('Los campos de compromiso de pago no existen en la base de datos. Por favor, ejecuta la migración: npx prisma migrate dev');
    }
    throw error;
  }

  // Validar que la fecha de compromiso sea futura
  const commitmentDateObj = dayjs(commitmentDate).toDate();
  if (dayjs(commitmentDateObj).isBefore(dayjs(), 'day')) {
    throw new Error('La fecha de compromiso debe ser futura');
  }

  // Actualizar o crear el compromiso
  const billingAccount = await prisma.billingAccount.update({
    where: { customerId },
    data: {
      paymentCommitmentDate: commitmentDateObj,
      paymentCommitmentNotes: notes || null,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      }
    }
  });

  // Si el cliente está suspendido, reactivarlo
  if (billingAccount.status === 'SUSPENDED') {
    console.log(`🔄 Cliente ${customer.name} está suspendido, reactivando por compromiso de pago...`);
    
    try {
      await billingService.reactivateCustomerIfCut(customerId);
      
      // Actualizar estado de la cuenta
      await prisma.billingAccount.update({
        where: { customerId },
        data: {
          status: 'ACTIVE',
          suspendedAt: null,
        }
      });

      // Enviar notificación
      try {
        await notificationService.sendPaymentReminder(
          customerId,
          `Su servicio ha sido reactivado por compromiso de pago hasta el ${dayjs(commitmentDateObj).format('DD/MM/YYYY')}. Por favor, registre su pago antes de esa fecha.`
        );
      } catch (notifError) {
        console.warn(`⚠️ Error enviando notificación:`, notifError.message);
      }
    } catch (reactivateError) {
      console.error(`❌ Error al reactivar cliente:`, reactivateError.message);
      // No lanzar error, el compromiso se creó correctamente
    }
  }

  console.log(`✅ Compromiso de pago creado/actualizado para cliente ${customer.name}`);
  return billingAccount;
};

/**
 * Eliminar un compromiso de pago
 * @param {string} customerId - ID del cliente
 * @returns {Promise<Object>} BillingAccount actualizado
 */
const removePaymentCommitment = async (customerId) => {
  console.log(`🗑️ Eliminando compromiso de pago para cliente ${customerId}`);
  
  const billingAccount = await prisma.billingAccount.update({
    where: { customerId },
    data: {
      paymentCommitmentDate: null,
      paymentCommitmentNotes: null,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  console.log(`✅ Compromiso de pago eliminado para cliente ${billingAccount.customer.name}`);
  return billingAccount;
};

/**
 * Obtener compromisos de pago activos (fecha futura)
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Array>} Lista de compromisos activos
 */
const getActivePaymentCommitments = async (filters = {}) => {
  const { customerId, from, to } = filters;
  
  const where = {
    paymentCommitmentDate: {
      gte: from ? dayjs(from).toDate() : new Date(), // Solo futuros
    },
    status: {
      not: 'CANCELLED'
    }
  };

  if (customerId) {
    where.customerId = customerId;
  }

  if (to) {
    where.paymentCommitmentDate = {
      ...where.paymentCommitmentDate,
      lte: dayjs(to).toDate()
    };
  }

  const commitments = await prisma.billingAccount.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true
        }
      }
    },
    orderBy: {
      paymentCommitmentDate: 'asc'
    }
  });

  return commitments;
};

/**
 * Verificar y procesar compromisos de pago vencidos
 * Corta el servicio a clientes que tienen compromisos vencidos y no han pagado
 * @returns {Promise<Object>} Estadísticas del proceso
 */
const processExpiredPaymentCommitments = async () => {
  console.log('🔍 Verificando compromisos de pago vencidos...');
  
  const today = dayjs().startOf('day').toDate();
  const cutProfile = process.env.MIKROTIK_CUT_PROFILE || 'CORTE MOROSO';
  
  // Buscar compromisos vencidos donde el cliente aún tiene deuda
  const expiredCommitments = await prisma.billingAccount.findMany({
    where: {
      paymentCommitmentDate: {
        lt: today // Fecha de compromiso pasada
      },
      balance: {
        gt: 0 // Aún tiene deuda
      },
      status: {
        not: 'SUSPENDED' // No está ya suspendido
      }
    },
    include: {
      customer: {
        include: {
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
      }
    }
  });

  if (expiredCommitments.length === 0) {
    console.log('✅ No hay compromisos de pago vencidos para procesar.');
    return {
      total: 0,
      cut: 0,
      failed: 0,
      skipped: 0
    };
  }

  console.log(`📊 Encontrados ${expiredCommitments.length} compromisos vencidos. Procediendo al corte...`);

  let cutCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const account of expiredCommitments) {
    const customer = account.customer;
    
    if (!customer.pppoeAccounts || customer.pppoeAccounts.length === 0) {
      console.warn(`⚠️ Cliente ${customer.name} no tiene cuentas PPPoE activas`);
      skippedCount++;
      continue;
    }

    // Procesar todas las cuentas PPPoE del cliente
    for (const pppoeAccount of customer.pppoeAccounts) {
      if (!pppoeAccount.username) {
        continue;
      }

      try {
        console.log(`🔪 Cortando servicio a ${customer.name} (Usuario: ${pppoeAccount.username}) - Compromiso vencido`);
        
        // Cambiar perfil en Mikrotik
        await pppoeService.changeCustomerProfile(pppoeAccount.username, cutProfile);

        // Actualizar estado en BD
        await prisma.billingAccount.update({
          where: { id: account.id },
          data: {
            status: 'SUSPENDED',
            suspendedAt: new Date(),
            paymentCommitmentDate: null, // Limpiar compromiso vencido
            paymentCommitmentNotes: null,
          },
        });

        // Suspender planes activos
        await prisma.customerPlan.updateMany({
          where: { customerId: customer.id, status: 'ACTIVE' },
          data: { status: 'SUSPENDED' },
        });

        // Enviar notificación
        try {
          await notificationService.sendPaymentReminder(
            customer.id,
            `Su compromiso de pago ha vencido y el servicio ha sido suspendido. Saldo pendiente: S/ ${Number(account.balance).toFixed(2)}. Pague para reactivar.`
          );
        } catch (notifError) {
          console.warn(`⚠️ Error enviando notificación:`, notifError.message);
        }

        console.log(`✅ Cliente ${customer.name} cortado exitosamente por compromiso vencido.`);
        cutCount++;
      } catch (err) {
        console.error(`❌ Error al cortar a ${customer.name}:`, err.message);
        failedCount++;
      }
    }
  }

  const result = {
    total: expiredCommitments.length,
    cut: cutCount,
    failed: failedCount,
    skipped: skippedCount
  };

  console.log(`🎉 Proceso de compromisos vencidos completado: ${cutCount} cortes exitosos, ${failedCount} fallidos, ${skippedCount} omitidos`);
  return result;
};

module.exports = {
  createOrUpdatePaymentCommitment,
  removePaymentCommitment,
  getActivePaymentCommitments,
  processExpiredPaymentCommitments
};


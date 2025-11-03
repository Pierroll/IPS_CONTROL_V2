const prisma = require('../models/prismaClient');
const { createCustomerSchema, updateCustomerSchema } = require('../validations/customerValidation');
const pppoeService = require('./pppoeService');
const routerService = require('./routerService'); // Import routerService for encryption

const generateCustomerCode = async () => {
  const count = await prisma.customer.count();
  return `CLT-${String(count + 1).padStart(4, '0')}`;
};

const assignTechnician = async (district) => {
  const technician = await prisma.technician.findFirst({
    where: { district, active: true },
    select: { id: true },
  });
  return technician ? technician.id : null;
};

const generatePPPoEUsername = (customerName, customerCode) => {
  const cleanName = customerName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8);
  return `${cleanName}${customerCode.replace('CLT-', '')}`;
};

const generatePPPoEPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const createCustomer = async (data, createdBy, routerId = null, planId = null, pppoeUsername = null, pppoePassword = null) => {
  console.log("[DEBUG] Iniciando createCustomer...");
  const { error } = createCustomerSchema.validate(data);
  if (error) throw new Error(error.details[0].message);

  const existingEmail = data.email
    ? await prisma.customer.findFirst({ where: { email: data.email, deletedAt: null } })
    : null;
  if (existingEmail) throw new Error('El email ya está registrado');

  const code = await generateCustomerCode();
  const technicianId = await assignTechnician(data.district);

  console.log("[DEBUG] Creando registro de Customer en la BD...");
  const customer = await prisma.customer.create({
    data: {
      code,
      name: data.name,
      businessName: data.businessName,
      email: data.email,
      phone: data.phone,
      alternativePhone: data.alternativePhone,
      address: data.address,
      district: data.district,
      province: data.province,
      department: data.department,
      documentNumber: data.documentNumber,
      documentType: data.documentType,
      customerType: data.customerType || 'INDIVIDUAL',
      serviceType: data.serviceType,
      contractDate: data.contractDate,
      creditLimit: data.creditLimit,
      notes: data.notes,
      tags: data.tags || [],
      priority: data.priority || 'MEDIA',
      source: data.source,
      assignedSeller: data.assignedSeller,
      technicianId,
      createdBy,
      status: 'ACTIVE',
    },
  });
  console.log(`[DEBUG] Customer creado con ID: ${customer.id}`);

  if (routerId && pppoeUsername && pppoePassword) {
    console.log("[DEBUG] Datos PPPoE proporcionados. Iniciando proceso PPPoE...");
    try {
      let profile = 'default';
      if (planId) {
        const plan = await prisma.plan.findUnique({
          where: { id: planId },
          select: { name: true, mikrotikProfileName: true },
        });
        if (plan) {
          profile = plan.mikrotikProfileName || plan.name;
        }
      }
      console.log(`[DEBUG] Perfil PPPoE determinado: ${profile}`);

      const pppoeUserData = {
        username: pppoeUsername,
        password: pppoePassword,
        profile: profile,
        service: 'pppoe',
        comment: `Cliente: ${customer.name} (${customer.code})`,
      };

      console.log("[DEBUG] Llamando a pppoeService.createPPPoEUser...");
      const pppoeResult = await pppoeService.createPPPoEUser(routerId, pppoeUserData);
      console.log("[DEBUG] Resultado de createPPPoEUser:", pppoeResult);

      console.log("[DEBUG] Cifrando contraseña...");
      const { password: encryptedPassword, iv, authTag } = routerService.encryptPassword(pppoePassword);
      console.log("[DEBUG] Contraseña cifrada.");

      try {
        console.log("[DEBUG] Intentando crear registro en PppoeAccount...");
        await prisma.pppoeAccount.create({
          data: {
            customerId: customer.id,
            deviceId: routerId,
            username: pppoeUsername,
            password: encryptedPassword,
            iv: iv,
            authTag: authTag,
            profile: profile,
          },
        });
        console.log("✅ [DEBUG] Registro PppoeAccount creado exitosamente en la BD.");
      } catch (dbError) {
        console.error("❌ [DEBUG] Error al crear PppoeAccount en la BD:", dbError);
        // No relanzar el error para que el flujo principal continúe si es necesario
      }

      const pppoeMessage = pppoeResult.wasUpdated
        ? `Usuario PPPoE actualizado: ${pppoeUsername}`
        : `Usuario PPPoE creado: ${pppoeUsername}`;

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          notes: `${customer.notes || ''}\n${pppoeMessage}`.trim(),
        },
      });

      console.log(`✅ ${pppoeMessage} para cliente ${customer.name} y guardado en la base de datos.`);

      customer.pppoeUser = {
        username: pppoeUsername,
        profile: profile,
        routerId: routerId,
        status: pppoeResult.wasUpdated ? 'updated' : 'created',
      };

    } catch (pppoeError) {
      console.error(`❌ Error creando usuario PPPoE para cliente ${customer.name}:`, pppoeError);
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          notes: `${customer.notes || ''}\nError creando usuario PPPoE: ${pppoeError.message}`.trim(),
        },
      });
    }
  }

  console.log("[DEBUG] Fin de createCustomer.");
  return customer;
};

const getCustomers = async (filters = {}) => {
  const { district, technicianId } = filters;
  return prisma.customer.findMany({
    where: {
      deletedAt: null,
      district: district ? { equals: district } : undefined,
      technicianId: technicianId ? { equals: technicianId } : undefined,
    },
    select: {
      id: true,
      code: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      district: true,
      technicianId: true,
      createdAt: true,
      contractDate: true,
      status: true,
      customerPlans: {
        orderBy: { startDate: 'desc' },
        take: 1,
        select: {
          id: true,
          planId: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          plan: {
            select: { id: true, name: true, monthlyPrice: true, mikrotikProfileName: true },
          },
        },
      },
    },
  });
};

const getCustomerById = async (id) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      businessName: true,
      email: true,
      phone: true,
      alternativePhone: true,
      address: true,
      district: true,
      province: true,
      department: true,
      documentNumber: true,
      documentType: true,
      customerType: true,
      serviceType: true,
      contractDate: true,
      creditLimit: true,
      notes: true,
      tags: true,
      priority: true,
      source: true,
      assignedSeller: true,
      technicianId: true,
      createdAt: true,
      status: true,
      customerPlans: {
        orderBy: { startDate: 'desc' },
        take: 1,
        select: {
          id: true,
          planId: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          plan: {
            select: { id: true, name: true, monthlyPrice: true, mikrotikProfileName: true },
          },
        },
      },
      pppoeAccounts: {
        select: {
          username: true,
          profile: true,
          device: { select: { name: true, ipAddress: true } },
        },
      },
    },
  });
  if (!customer) throw new Error('Cliente no encontrado');
  return customer;
};

const updateCustomer = async (id, data) => {
  const { error } = updateCustomerSchema.validate(data);
  if (error) throw new Error(error.details[0].message);

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new Error('Cliente no encontrado');

  if (data.email && data.email !== customer.email) {
    const existingEmail = await prisma.customer.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existingEmail) throw new Error('El email ya está registrado');
  }

  return prisma.customer.update({
    where: { id },
    data: {
      name: data.name,
      businessName: data.businessName,
      email: data.email,
      phone: data.phone,
      alternativePhone: data.alternativePhone,
      address: data.address,
      district: data.district,
      province: data.province,
      department: data.department,
      documentNumber: data.documentNumber,
      documentType: data.documentType,
      customerType: data.customerType,
      serviceType: data.serviceType,
      contractDate: data.contractDate,
      creditLimit: data.creditLimit,
      notes: data.notes,
      tags: data.tags,
      priority: data.priority,
      source: data.source,
      assignedSeller: data.assignedSeller,
      technicianId: data.technicianId || (data.district ? await assignTechnician(data.district) : undefined),
    },
    select: {
      id: true,
      code: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      district: true,
      technicianId: true,
      createdAt: true,
      contractDate: true,
      status: true,
      customerPlans: {
        orderBy: { startDate: 'desc' },
        take: 1,
        select: {
          id: true,
          planId: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          plan: {
            select: { id: true, name: true, monthlyPrice: true, mikrotikProfileName: true },
          },
        },
      },
    },
  });
};

const deleteCustomer = async (id) => {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ 
      where: { id },
      include: { pppoeAccounts: true }
    });
    if (!customer) throw new Error('Cliente no encontrado');

    // Si hay cuentas PPPoE asociadas, eliminarlas del router y de la BD
    if (customer.pppoeAccounts && customer.pppoeAccounts.length > 0) {
      for (const pppoe of customer.pppoeAccounts) {
        try {
          await pppoeService.deletePPPoEUser(pppoe.deviceId, pppoe.username);
          await tx.pppoeAccount.delete({ where: { id: pppoe.id } });
          console.log(`✅ Cuenta PPPoE ${pppoe.username} eliminada del router y la BD.`);
        } catch (err) {
          // No detener el proceso si falla la eliminación en el router, pero registrarlo
          console.error(`⚠️  Error al eliminar la cuenta PPPoE ${pppoe.username} del router: ${err.message}`);
        }
      }
    }

    // Marcar el cliente como eliminado (soft delete)
    const deletedCustomer = await tx.customer.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });

    console.log(`✅ Cliente ${customer.name} marcado como eliminado.`);
    return deletedCustomer;
  });
};

// Función auxiliar para calcular el estado de pago del cliente
const calculatePaymentStatus = (customer) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();
  
  // Obtener el saldo actual de la cuenta de facturación
  const currentBalance = parseFloat(customer.billingAccount?.balance || 0);
  
  // Calcular pagos adelantados pendientes para el mes actual y futuros
  let advancePaymentInfo = null;
  let paidUntilDate = null;
  
  if (customer.advancePayments && customer.advancePayments.length > 0) {
    // Buscar pagos adelantados que cubran el mes actual o futuros
    const relevantAdvancePayments = customer.advancePayments.filter(ap => 
      ap.monthlyPayments.some(mp => 
        (mp.year > currentYear) || 
        (mp.year === currentYear && mp.month >= currentMonth)
      )
    );
    
    if (relevantAdvancePayments.length > 0) {
      // Encontrar el último mes pagado adelantado
      let lastPaidMonth = currentMonth;
      let lastPaidYear = currentYear;
      
      relevantAdvancePayments.forEach(ap => {
        ap.monthlyPayments.forEach(mp => {
          if (mp.status === 'PENDING') {
            if ((mp.year > lastPaidYear) || 
                (mp.year === lastPaidYear && mp.month > lastPaidMonth)) {
              lastPaidMonth = mp.month;
              lastPaidYear = mp.year;
            }
          }
        });
      });
      
      // Crear fecha hasta la cual está pagado
      paidUntilDate = new Date(lastPaidYear, lastPaidMonth - 1, 1); // Último día del mes pagado
      
      advancePaymentInfo = {
        hasAdvancePayments: true,
        paidUntilDate,
        paidUntilMonth: lastPaidMonth,
        paidUntilYear: lastPaidYear,
        totalAdvanceAmount: relevantAdvancePayments.reduce((sum, ap) => sum + parseFloat(ap.totalAmount), 0)
      };
    }
  }
  
  // Determinar el estado de pago
  let paymentStatus = 'CURRENT'; // Por defecto al día
  let statusMessage = 'Al día';
  
  if (currentBalance > 0) {
    // Hay deuda pendiente
    if (advancePaymentInfo) {
      // Tiene pagos adelantados pero también deuda
      paymentStatus = 'PARTIAL_ADVANCE';
      statusMessage = `Deuda: S/ ${currentBalance.toFixed(2)} | Pagado hasta: ${advancePaymentInfo.paidUntilMonth}/${advancePaymentInfo.paidUntilYear}`;
    } else {
      // Solo tiene deuda
      paymentStatus = 'OVERDUE';
      statusMessage = `Deuda: S/ ${currentBalance.toFixed(2)}`;
    }
  } else if (advancePaymentInfo) {
    // No hay deuda y tiene pagos adelantados
    paymentStatus = 'ADVANCE_PAID';
    statusMessage = `Pagado hasta: ${advancePaymentInfo.paidUntilMonth}/${advancePaymentInfo.paidUntilYear}`;
  } else if (currentBalance < 0) {
    // Tiene crédito a favor
    paymentStatus = 'CREDIT';
    statusMessage = `A favor: S/ ${Math.abs(currentBalance).toFixed(2)}`;
  }
  
  return {
    paymentStatus,
    statusMessage,
    currentBalance,
    advancePaymentInfo,
    paidUntilDate
  };
};

const getCustomersWithDetails = async (filters = {}) => {
  const { district, technicianId, routerId, search } = filters;
  
  // Construir filtros dinámicos
  const whereClause = {
    deletedAt: null,
    district: district ? { equals: district } : undefined,
    technicianId: technicianId ? { equals: technicianId } : undefined,
  };

  // Filtro de búsqueda por nombre
  if (search) {
    whereClause.name = { contains: search, mode: 'insensitive' };
  }

  // Filtro por MikroTik (basado en las notas que contienen información del router)
  if (routerId) {
    whereClause.notes = { contains: `routerId:${routerId}`, mode: 'insensitive' };
  }

  const customers = await prisma.customer.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      district: true,
      province: true,
      department: true,
      notes: true,
      customerPlans: {
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
        take: 1,
        select: {
          id: true,
          planId: true,
          status: true,
          startDate: true,
          plan: { select: { name: true, monthlyPrice: true, mikrotikProfileName: true } },
        },
      },
      billingAccount: { 
        select: { 
          balance: true, 
          status: true,
          lastPaymentDate: true,
          suspendedAt: true
        } 
      },
      advancePayments: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          totalAmount: true,
          monthsCount: true,
          paymentDate: true,
          monthlyPayments: {
            where: { status: 'PENDING' },
            select: {
              month: true,
              year: true,
              amount: true,
              status: true
            }
          }
        }
      },
      invoices: {
        orderBy: { dueDate: 'desc' },
        take: 1,
        select: {
          id: true,
          invoiceNumber: true,
          periodStart: true,
          periodEnd: true,
          dueDate: true,
          status: true,
          total: true,
          balanceDue: true
        }
      }
    },
    orderBy: [{ name: 'asc' }],
  });

  // Aplicar el cálculo de estado de pago a cada cliente
  return customers.map(customer => {
    const paymentStatusInfo = calculatePaymentStatus(customer);
    
    return {
      ...customer,
      paymentStatus: paymentStatusInfo.paymentStatus,
      statusMessage: paymentStatusInfo.statusMessage,
      advancePaymentInfo: paymentStatusInfo.advancePaymentInfo,
      paidUntilDate: paymentStatusInfo.paidUntilDate
    };
  });
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomersWithDetails,
};
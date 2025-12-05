const prisma = require('../models/prismaClient');
const { sendWhatsAppNotification } = require('../utils/whatsapp');
const { createTicketSchema, updateTicketSchema } = require('../validations/ticketValidation');

const generateTicketNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.ticket.count();
  return `TK-${year}-${String(count + 1).padStart(4, '0')}`;
};

const assignTechnician = async (serviceDistrict) => {
  const technician = await prisma.technician.findFirst({
    where: {
      district: serviceDistrict,
      active: true,
    },
    select: { id: true },
  });
  return technician ? technician.id : null;
};

const createTicket = async (data, createdBy) => {
  const { error } = createTicketSchema.validate(data);
  if (error) throw new Error(error.details[0].message);

  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!customer) throw new Error('Cliente no encontrado');

  const ticketNumber = await generateTicketNumber();
  
  // Usar el técnico asignado del frontend, o asignar automáticamente si no se proporciona
  let assignedTechnician = data.assignedTechnician;
  if (!assignedTechnician) {
    assignedTechnician = await assignTechnician(data.serviceDistrict);
  }

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      customerId: data.customerId,
      title: data.title,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory || null,
      priority: data.priority,
      serviceAddress: data.serviceAddress || null,
      serviceDistrict: data.serviceDistrict,
      gpsCoordinates: data.gpsCoordinates || null,
      notes: data.notes || null,
      internalNotes: data.internalNotes || null,
      clientNotes: data.clientNotes || null,
      tags: data.tags,
      slaLevel: data.slaLevel,
      dueDate: data.dueDate || null,
      estimatedCost: data.estimatedCost || null,
      estimatedHours: data.estimatedHours || null,
      createdBy,
      assignedTechnician,
    },
    select: {
      id: true,
      ticketNumber: true,
      customerId: true,
      customer: {
        select: {
          name: true,
          phone: true,
        }
      },
      title: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      serviceDistrict: true,
      assignedTechnician: true,
      createdAt: true,
    },
  });

  // Notificar al técnico si fue asignado
  if (assignedTechnician) {
    const technician = await prisma.technician.findUnique({
      where: { id: assignedTechnician },
      select: { phone: true, name: true, code: true },
    });
    
    if (technician?.phone) {
      // Formatear número para WhatsApp (sin +)
      let phoneNumber = technician.phone;
      if (phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.substring(1);
      }
      if (!phoneNumber.startsWith('51')) {
        phoneNumber = '51' + phoneNumber;
      }
      
      const message = `🔧 *Nuevo Ticket Asignado*\n\n📋 *Ticket:* #${ticketNumber}\n👤 *Cliente:* ${customer.name}\n📝 *Razón:* ${data.title}\n📄 *Descripción:* ${data.description}\n⚡ *Prioridad:* ${data.priority}\n\n¡Por favor revisa el ticket en el sistema!`;
      await sendWhatsAppNotification(phoneNumber, message);
    }
  }

  return ticket;
};

const getTickets = async (filters = {}) => {
  const { customerId, assignedTechnician, status, category, page = '1', limit = '20' } = filters;
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 20;
  const skip = (parsedPage - 1) * parsedLimit;

  return prisma.ticket.findMany({
    where: {
      deletedAt: null,
      customerId: customerId ? { equals: customerId } : undefined,
      assignedTechnician: assignedTechnician ? { equals: assignedTechnician } : undefined,
      status: status ? { equals: status } : undefined,
      category: category ? { equals: category } : undefined,
    },
    select: {
      id: true,
      ticketNumber: true,
      customerId: true,
      title: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      serviceDistrict: true,
      assignedTechnician: true,
      createdAt: true,
      customer: { select: { name: true } },
      technician: { select: { name: true } },
    },
    skip,
    take: parsedLimit,
    orderBy: { createdAt: 'desc' },
  });
};

const getTicketById = async (id) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, phone: true } },
      technician: { select: { name: true, phone: true } },
      attachments: true,
      history: true,
      workLogs: true,
      rating: true,
    },
  });
  if (!ticket || ticket.deletedAt) throw new Error('Ticket no encontrado');
  return ticket;
};

const updateTicket = async (id, data, userId) => {
  const { error } = updateTicketSchema.validate(data);
  if (error) throw new Error(error.details[0].message);

  const oldTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!oldTicket || oldTicket.deletedAt) throw new Error('Ticket no encontrado');

  // Loggear cambios en history
  await prisma.ticketHistory.create({
    data: {
      ticketId: id,
      userId,
      action: 'UPDATE',
      oldValue: {
        status: oldTicket.status,
        priority: oldTicket.priority,
        assignedTechnician: oldTicket.assignedTechnician,
        // Agrega más campos si necesitas
      },
      newValue: {
        status: data.status,
        priority: data.priority,
        assignedTechnician: data.assignedTechnician,
      },
      notes: data.notes,
    },
  });

  const assignedTechnician = data.assignedTechnician || (data.serviceDistrict ? await assignTechnician(data.serviceDistrict) : oldTicket.assignedTechnician);

  const ticket = await prisma.ticket.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory || null,
      priority: data.priority,
      status: data.status,
      serviceAddress: data.serviceAddress,
      serviceDistrict: data.serviceDistrict,
      gpsCoordinates: data.gpsCoordinates,
      notes: data.notes,
      internalNotes: data.internalNotes,
      clientNotes: data.clientNotes,
      tags: data.tags,
      slaLevel: data.slaLevel,
      dueDate: data.dueDate,
      estimatedCost: data.estimatedCost,
      estimatedHours: data.estimatedHours,
      assignedTechnician,
      assignedTo: data.assignedTo,
    },
    select: {
      id: true,
      ticketNumber: true,
      customerId: true,
      title: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      serviceDistrict: true,
      assignedTechnician: true,
      createdAt: true,
    },
  });

  // Notificar si cambió el asignado
  if (assignedTechnician && assignedTechnician !== oldTicket.assignedTechnician) {
    const technician = await prisma.technician.findUnique({
      where: { id: assignedTechnician },
      select: { phone: true, name: true },
    });
    const customer = await prisma.customer.findUnique({
      where: { id: ticket.customerId },
      select: { name: true },
    });
    if (technician?.phone) {
      const message = `Ticket actualizado y asignado: #${ticket.ticketNumber}\nCliente: ${customer.name}\nRazón: ${ticket.title}\nDescripción: ${ticket.description}\nPrioridad: ${ticket.priority}`;
      await sendWhatsAppNotification(technician.phone, message);
    }
  }

  return ticket;
};

const updateTicketStatus = async (id, status, userId) => {
  const validStatuses = ['PENDIENTE', 'ASIGNADO', 'EN_PROGRESO', 'ESCALADO', 'EN_ESPERA', 'RESUELTO', 'CERRADO', 'CANCELADO'];
  
  if (!status) {
    throw new Error('El estado es requerido');
  }
  
  if (!validStatuses.includes(status)) {
    throw new Error(`Estado de ticket inválido: "${status}". Estados válidos: ${validStatuses.join(', ')}`);
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || ticket.deletedAt) throw new Error('Ticket no encontrado');

  // Loggear cambio de estado en history
  await prisma.ticketHistory.create({
    data: {
      ticketId: id,
      action: 'STATUS_CHANGED',
      userId,
      oldValue: { status: ticket.status },
      newValue: { status: status },
      notes: `Estado cambiado de ${ticket.status} a ${status}`,
    },
  });

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      ticketNumber: true,
      customerId: true,
      customer: {
        select: {
          name: true,
          phone: true,
        }
      },
      title: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      serviceDistrict: true,
      assignedTechnician: true,
      technician: {
        select: {
          name: true,
          phone: true,
        }
      },
      createdAt: true,
    },
  });

  return updatedTicket;
};

const deleteTicket = async (id) => {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || ticket.deletedAt) throw new Error('Ticket no encontrado');

  return prisma.ticket.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'CANCELADO' },
    select: {
      id: true,
      ticketNumber: true,
      customerId: true,
      title: true,
    },
  });
};

const addAttachment = async (ticketId, file, userId) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error('Ticket no encontrado');

  return prisma.ticketAttachment.create({
    data: {
      ticketId,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`, // Ajusta según tu config
      uploadedBy: userId,
    },
  });
};

const addRating = async (ticketId, data, createdBy) => {
  const { rating, comment } = data;
  if (rating < 1 || rating > 5) throw new Error('Calificación inválida');

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || !ticket.assignedTechnician) throw new Error('Ticket no encontrado o sin técnico asignado');

  return prisma.technicianRating.create({
    data: {
      technicianId: ticket.assignedTechnician,
      ticketId,
      rating,
      comment,
      createdBy,
    },
  });
};

const getTicketHistory = async (ticketId) => {
  return prisma.ticketHistory.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  deleteTicket,
  addAttachment,
  addRating,
  getTicketHistory,
};
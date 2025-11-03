const prisma = require('../models/prismaClient');
const { createTechnicianSchema, updateTechnicianSchema } = require('../validations/technicianValidation');

const generateTechnicianCode = async () => {
  const count = await prisma.technician.count({ where: { deletedAt: null } });
  return `TECH-${String(count + 1).padStart(4, '0')}`;
};

const createTechnician = async (data, createdBy) => {
  const { error } = createTechnicianSchema.validate(data);
  if (error) throw new Error(error.details[0].message);

  // Verificar email único si se proporciona
  if (data.email) {
    const existingEmail = await prisma.technician.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existingEmail) throw new Error('El email ya está registrado');
  }

  // Verificar teléfono único
  const existingPhone = await prisma.technician.findFirst({
    where: { phone: data.phone, deletedAt: null },
  });
  if (existingPhone) throw new Error('El teléfono ya está registrado');

  // Verificar userId único si se proporciona
  if (data.userId) {
    const existingUser = await prisma.technician.findFirst({
      where: { userId: data.userId, deletedAt: null },
    });
    if (existingUser) throw new Error('El usuario ya está asignado a un técnico');
  }

  const code = await generateTechnicianCode();

  return prisma.technician.create({
    data: {
      code,
      name: data.name,
      phone: data.phone,
      email: data.email,
      documentNumber: data.documentNumber,
      userId: data.userId,
      specialties: data.specialties,
      certifications: data.certifications,
      experience: data.experience,
      hourlyRate: data.hourlyRate,
      workSchedule: data.workSchedule,
      isExternal: data.isExternal,
      active: data.active,
      rating: 0, // Default inicial
      totalJobs: 0, // Default inicial
      district: data.district,
      province: data.province,
      department: data.department,
      createdBy, // Asumiendo que createdBy es el userId del creador (agrega campo si no existe en schema)
    },
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      email: true,
      district: true,
      province: true,
      department: true,
      active: true,
      createdAt: true,
    },
  });
};

const getTechnicians = async (filters = {}) => {
  const { district, active, province } = filters;
  return prisma.technician.findMany({
    where: {
      deletedAt: null,
      district: district ? { equals: district } : undefined,
      active: active !== undefined ? { equals: active } : undefined,
      province: province ? { equals: province } : undefined,
    },
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      email: true,
      district: true,
      province: true,
      department: true,
      active: true,
      rating: true,
      totalJobs: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getTechnicianById = async (id) => {
  const technician = await prisma.technician.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      email: true,
      documentNumber: true,
      specialties: true,
      certifications: true,
      experience: true,
      hourlyRate: true,
      workSchedule: true,
      isExternal: true,
      active: true,
      rating: true,
      totalJobs: true,
      district: true,
      province: true,
      department: true,
      createdAt: true,
      userId: true, // Opcional, sin exponer datos sensibles de User
    },
  });
  if (!technician) throw new Error('Técnico no encontrado');
  return technician;
};

const updateTechnician = async (id, data) => {
  const { error } = updateTechnicianSchema.validate(data);
  if (error) throw new Error(error.details[0].message);

  const technician = await prisma.technician.findUnique({ where: { id } });
  if (!technician) throw new Error('Técnico no encontrado');

  // Verificar cambios en email/teléfono
  if (data.email && data.email !== technician.email) {
    const existingEmail = await prisma.technician.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existingEmail) throw new Error('El email ya está registrado');
  }

  if (data.phone && data.phone !== technician.phone) {
    const existingPhone = await prisma.technician.findFirst({
      where: { phone: data.phone, deletedAt: null },
    });
    if (existingPhone) throw new Error('El teléfono ya está registrado');
  }

  if (data.userId && data.userId !== technician.userId) {
    const existingUser = await prisma.technician.findFirst({
      where: { userId: data.userId, deletedAt: null },
    });
    if (existingUser) throw new Error('El usuario ya está asignado a un técnico');
  }

  return prisma.technician.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      documentNumber: data.documentNumber,
      userId: data.userId,
      specialties: data.specialties,
      certifications: data.certifications,
      experience: data.experience,
      hourlyRate: data.hourlyRate,
      workSchedule: data.workSchedule,
      isExternal: data.isExternal,
      active: data.active,
      district: data.district,
      province: data.province,
      department: data.department,
    },
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      email: true,
      district: true,
      province: true,
      department: true,
      active: true,
      createdAt: true,
    },
  });
};

const deleteTechnician = async (id) => {
  const technician = await prisma.technician.findUnique({ where: { id } });
  if (!technician) throw new Error('Técnico no encontrado');

  return prisma.technician.update({
    where: { id },
    data: { 
      active: false, 
      deletedAt: new Date() // Agrega este campo al schema si no lo tienes
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });
};

module.exports = {
  createTechnician,
  getTechnicians,
  getTechnicianById,
  updateTechnician,
  deleteTechnician,
};
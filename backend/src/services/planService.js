// backend/src/services/planService.js
const prisma = require('../models/prismaClient');
const { createPlanSchema, updatePlanSchema } = require('../validations/planValidation');

const createPlan = async (data, createdBy) => {
  const { error } = createPlanSchema.validate(data);
  if (error) throw new Error(error.details[0].message);

  return prisma.plan.create({
    data: {
      name: data.name,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      downloadSpeed: data.downloadSpeed,
      uploadSpeed: data.uploadSpeed,
      dataLimit: data.dataLimit,
      monthlyPrice: data.monthlyPrice,
      setupFee: data.setupFee,
      active: data.active,
      isPromotional: data.isPromotional,
      slaLevel: data.slaLevel,
      supportHours: data.supportHours,
      features: data.features,
      restrictions: data.restrictions,
      targetAudience: data.targetAudience,
      mikrotikProfileName: data.mikrotikProfileName, // Add this line
      createdBy,
    },
    select: {
      id: true,
      code: true,
      name: true,
      monthlyPrice: true,
      category: true,
      subcategory: true,
      active: true,
      createdAt: true,
      mikrotikProfileName: true, // Add this line
    },
  });
};

const getPlans = async (filters = {}) => {
  const { status, category, active, subcategory } = filters;
  const plans = await prisma.plan.findMany({
    where: {
      deletedAt: null,
      active: active !== undefined ? active : undefined,
      category: category ? { equals: category } : undefined,
      subcategory: subcategory ? { equals: subcategory } : undefined,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      category: true,
      subcategory: true,
      downloadSpeed: true,
      uploadSpeed: true,
      dataLimit: true,
      monthlyPrice: true,
      setupFee: true,
      active: true,
      isPromotional: true,
      slaLevel: true,
      supportHours: true,
      features: true,
      restrictions: true,
      targetAudience: true,
      mikrotikProfileName: true, // Add this line
      createdAt: true,
    },
  });

  // Convertir campos Decimal a números
  return plans.map(plan => ({
    ...plan,
    downloadSpeed: plan.downloadSpeed ? Number(plan.downloadSpeed) : null,
    uploadSpeed: plan.uploadSpeed ? Number(plan.uploadSpeed) : null,
    monthlyPrice: plan.monthlyPrice ? Number(plan.monthlyPrice) : null,
    setupFee: plan.setupFee ? Number(plan.setupFee) : null,
  }));
};

const getPlanById = async (id) => {
  const plan = await prisma.plan.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      category: true,
      subcategory: true,
      downloadSpeed: true,
      uploadSpeed: true,
      dataLimit: true,
      monthlyPrice: true,
      setupFee: true,
      active: true,
      isPromotional: true,
      slaLevel: true,
      supportHours: true,
      features: true,
      restrictions: true,
      targetAudience: true,
      mikrotikProfileName: true, // Add this line
      createdAt: true,
    },
  });
  if (!plan) throw new Error('Plan no encontrado');

  // Convertir campos Decimal a números
  return {
    ...plan,
    downloadSpeed: plan.downloadSpeed ? Number(plan.downloadSpeed) : null,
    uploadSpeed: plan.uploadSpeed ? Number(plan.uploadSpeed) : null,
    monthlyPrice: plan.monthlyPrice ? Number(plan.monthlyPrice) : null,
    setupFee: plan.setupFee ? Number(plan.setupFee) : null,
  };
};

const updatePlan = async (id, data) => {
  const { error } = updatePlanSchema.validate(data);
  if (error) throw new Error(error.details[0].message);

  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) throw new Error('Plan no encontrado');

  return prisma.plan.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      downloadSpeed: data.downloadSpeed,
      uploadSpeed: data.uploadSpeed,
      dataLimit: data.dataLimit,
      monthlyPrice: data.monthlyPrice,
      setupFee: data.setupFee,
      active: data.active,
      isPromotional: data.isPromotional,
      slaLevel: data.slaLevel,
      supportHours: data.supportHours,
      features: data.features,
      restrictions: data.restrictions,
      targetAudience: data.targetAudience,
      mikrotikProfileName: data.mikrotikProfileName, // Add this line
    },
    select: {
      id: true,
      code: true,
      name: true,
      monthlyPrice: true,
      category: true,
      subcategory: true,
      active: true,
      createdAt: true,
      mikrotikProfileName: true, // Add this line
    },
  });
};

const deletePlan = async (id) => {
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) throw new Error('Plan no encontrado');

  return prisma.plan.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });
};

module.exports = {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
};
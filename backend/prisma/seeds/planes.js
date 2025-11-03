const { PrismaClient } = require('../../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  // Verificar la existencia del usuario adxmin
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
  if (!adminUser) {
    throw new Error('Usuario admin@test.com no encontrado. Ejecute el seed de usuarios primero.');
  }

  const plans = [
    // Planes por Antena
    {
      code: 'PLAN-0001',
      name: 'Plan Básico Antena',
      description: 'Ideal para navegación básica y correo electrónico 📧',
      category: 'INTERNET',
      subcategory: 'ANTENA',
      downloadSpeed: 30.00,
      uploadSpeed: 30.00, // Simétrico
      dataLimit: null,
      monthlyPrice: 60.00,
      setupFee: 0.00,
      active: true,
      isPromotional: false,
      slaLevel: 'BASIC',
      supportHours: '8-18',
      features: ['Soporte técnico', 'Navegación básica'],
      restrictions: ['Contrato mínimo 12 meses'],
      targetAudience: ['Estudiantes', 'Usuarios básicos'],
      createdBy: adminUser.id,
    },
    {
      code: 'PLAN-0002',
      name: 'Plan Estándar Antena',
      description: 'Ideal para navegación y streaming de video 📺',
      category: 'INTERNET',
      subcategory: 'ANTENA',
      downloadSpeed: 50.00,
      uploadSpeed: 50.00, // Simétrico
      dataLimit: null,
      monthlyPrice: 100.00,
      setupFee: 0.00,
      active: true,
      isPromotional: false,
      slaLevel: 'STANDARD',
      supportHours: '24/7',
      features: ['Soporte técnico', 'Contenido exclusivo'],
      restrictions: ['Contrato mínimo 12 meses'],
      targetAudience: ['Trabajadores remotos', 'Jugadores en línea', 'Estudiantes'],
      createdBy: adminUser.id,
    },
    {
      code: 'PLAN-0003',
      name: 'Plan Avanzado Antena',
      description: 'Ideal para navegación intensiva y uso de aplicaciones en línea 📊',
      category: 'INTERNET',
      subcategory: 'ANTENA',
      downloadSpeed: 70.00,
      uploadSpeed: 70.00, // Simétrico
      dataLimit: null,
      monthlyPrice: 160.00,
      setupFee: 0.00,
      active: true,
      isPromotional: false,
      slaLevel: 'PREMIUM',
      supportHours: '24/7',
      features: ['Soporte técnico', 'Contenido exclusivo', 'Prioridad en atención al cliente'],
      restrictions: ['Contrato mínimo 12 meses'],
      targetAudience: ['Jugadores en línea', 'Transmisiones en vivo', 'Empresas'],
      createdBy: adminUser.id,
    },
    // Planes por Fibra Óptica
    {
      code: 'PLAN-0004',
      name: 'Plan Básico Fibra',
      description: 'Ideal para navegación básica y correo electrónico 📧',
      category: 'INTERNET',
      subcategory: 'FIBRA_OPTICA',
      downloadSpeed: 15.00,
      uploadSpeed: 15.00, // Simétrico
      dataLimit: null,
      monthlyPrice: 60.00,
      setupFee: 0.00,
      active: true,
      isPromotional: false,
      slaLevel: 'BASIC',
      supportHours: '8-18',
      features: ['Soporte técnico', 'Navegación básica'],
      restrictions: ['Contrato mínimo 12 meses'],
      targetAudience: ['Estudiantes', 'Usuarios básicos'],
      createdBy: adminUser.id,
    },
    {
      code: 'PLAN-0005',
      name: 'Plan Estándar Fibra',
      description: 'Ideal para navegación y streaming de video 📺',
      category: 'INTERNET',
      subcategory: 'FIBRA_OPTICA',
      downloadSpeed: 25.00,
      uploadSpeed: 25.00, // Simétrico
      dataLimit: null,
      monthlyPrice: 100.00,
      setupFee: 0.00,
      active: true,
      isPromotional: false,
      slaLevel: 'STANDARD',
      supportHours: '24/7',
      features: ['Soporte técnico', 'Contenido exclusivo'],
      restrictions: ['Contrato mínimo 12 meses'],
      targetAudience: ['Trabajadores remotos', 'Jugadores en línea', 'Estudiantes'],
      createdBy: adminUser.id,
    },
    {
      code: 'PLAN-0006',
      name: 'Plan Avanzado Fibra',
      description: 'Ideal para navegación intensiva y uso de aplicaciones en línea 📊',
      category: 'INTERNET',
      subcategory: 'FIBRA_OPTICA',
      downloadSpeed: 35.00,
      uploadSpeed: 35.00, // Simétrico
      dataLimit: null,
      monthlyPrice: 160.00,
      setupFee: 0.00,
      active: true,
      isPromotional: false,
      slaLevel: 'PREMIUM',
      supportHours: '24/7',
      features: ['Soporte técnico', 'Contenido exclusivo', 'Prioridad en atención al cliente'],
      restrictions: ['Contrato mínimo 12 meses'],
      targetAudience: ['Jugadores en línea', 'Transmisiones en vivo', 'Empresas'],
      createdBy: adminUser.id,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code }, // Usar 'code' como clave única
      update: {}, // No actualizar si ya existe
      create: plan,
    });
  }

  console.log('Planes creados exitosamente');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
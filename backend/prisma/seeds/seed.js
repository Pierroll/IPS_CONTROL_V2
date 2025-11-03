const { PrismaClient } = require('../../src/generated/prisma');
const { hashPassword } = require('../../src/config/auth');

const prisma = new PrismaClient();

async function main() {
  // Crear usuario admin
  const adminEmail = 'admin@test.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await hashPassword('admin123');
    await prisma.user.create({
      data: {
        id: 'b495da59-a89f-40d3-9cf8-8654a9624e02',
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin Principal',
        firstName: 'Admin',
        lastName: 'Principal',
        phone: '+51987654321',
        role: 'ADMIN',
        active: true,
        emailVerified: true,
        timezone: 'America/Lima',
        language: 'es',
      },
    });
    console.log('Usuario administrador creado');
  } else {
    console.log('Usuario administrador ya existe');
  }

  // Crear usuario seller
  const sellerEmail = 'seller@test.com';
  const existingSeller = await prisma.user.findUnique({ where: { email: sellerEmail } });

  if (!existingSeller) {
    const hashedSellerPassword = await hashPassword('seller123');
    await prisma.user.create({
      data: {
        id: 'c1234567-89ab-cdef-0123-456789abcdef',
        email: sellerEmail,
        password: hashedSellerPassword,
        name: 'Seller Prueba',
        firstName: 'Seller',
        lastName: 'Prueba',
        phone: '+51912345678',
        role: 'SELLER',
        active: true,
        emailVerified: true,
        timezone: 'America/Lima',
        language: 'es',
      },
    });
    console.log('Usuario seller creado');
  } else {
    console.log('Usuario seller ya existe');
  }
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
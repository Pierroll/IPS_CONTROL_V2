// backend/src/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const app = require('./app');
const prisma = require('./models/prismaClient');

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL); // Log para depurar
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando servidor');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Proceso terminado');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT recibido, cerrando servidor');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Proceso terminado');
    process.exit(0);
  });
});
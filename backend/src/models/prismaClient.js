// src/models/prismaClient.js
const { PrismaClient } = require('../generated/prisma'); // <-- Ruta correcta
const prisma = new PrismaClient();

module.exports = prisma;

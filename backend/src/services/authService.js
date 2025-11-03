// src/services/authService.js
const prisma = require('../models/prismaClient'); // Usar instancia centralizada
const { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/auth');
const jwt = require('jsonwebtoken');

const registerUser = async (userData) => {
  const { email, password, name, role = 'SELLER' } = userData;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Usuario ya existe');
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      active: true, // Forzar activo explícitamente
      createdAt: new Date(),
      updatedAt: new Date(),
      timezone: "America/Lima",
      language: "es",
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    deletedAt: user.deletedAt,
  };
};
const loginUser = async (email, password, userAgent, ip) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { refreshTokens: true },
  });

  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  if (!await comparePassword(password, user.password)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: { increment: 1 } },
    });
    if (user.loginAttempts + 1 >= 5) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
      });
    }
    throw new Error('Credenciales inválidas');
  }

  if (user.lockedUntil && new Date() < user.lockedUntil) {
    throw new Error('Cuenta bloqueada. Intenta de nuevo más tarde');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user, userAgent, ip);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      userAgent,
      ipAddress: ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date(), loginAttempts: 0 },
  });

  return { user: { id: user.id, email: user.email, role: user.role, name: user.name }, accessToken, refreshToken };
};

const refreshAccessToken = async (refreshTokenStr) => {
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenStr },
  });

  if (!tokenRecord || tokenRecord.revoked || new Date() > tokenRecord.expiresAt) {
    throw new Error('Refresh token inválido o expirado');
  }

  const decoded = verifyRefreshToken(refreshTokenStr);
  if (!decoded) {
    throw new Error('Refresh token inválido');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const accessToken = generateAccessToken(user);
  return { accessToken };
};

const logoutUser = async (userId, refreshTokenStr) => {
  await prisma.refreshToken.updateMany({
    where: { userId, token: refreshTokenStr },
    data: { revoked: true },
  });
};

const getUsers = async (role) => {
  return prisma.user.findMany({
    where: { role, active: true }, // Filtrar solo usuarios activos por defecto
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true, // Añadir estado activo
      deletedAt: true, // Añadir estado de eliminación
      createdAt: true,
    },
  });
};

const getUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
};

const updateUser = async (id, data) => {
  const { password, ...rest } = data;
  if (password) {
    rest.password = await hashPassword(password);
  }
  return prisma.user.update({
    where: { id },
    data: rest,
    select: { id: true, email: true, name: true, role: true },
  });
};

const deleteUser = async (id) => {
  return prisma.user.update({
    where: { id },
    data: { active: false, deletedAt: new Date() },
    select: { id: true, email: true, name: true, role: true },
  });
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
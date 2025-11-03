// src/middleware/roles.js
const prisma = require('../models/prismaClient');

const authorizeRole = (roles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: 'Acceso denegado: Rol insuficiente' });
      }

      req.userRole = user.role;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Error en autorización' });
    }
  };
};

const isAdmin = authorizeRole(['ADMIN']);

module.exports = { authorizeRole, isAdmin };
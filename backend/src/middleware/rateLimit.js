// src/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por IP
  message: { error: 'Demasiados intentos, intenta de nuevo en 15 minutos' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por IP
  message: { error: 'Límite de registros alcanzado, intenta de nuevo en 1 hora' },
});

module.exports = { loginLimiter, registerLimiter };
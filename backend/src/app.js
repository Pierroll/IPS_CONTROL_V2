// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');
// Cargar jobs de cron
require('./jobs/billingJob');
require('./jobs/dunningJob');
require('./jobs/paymentJob');
require('./jobs/paymentCommitmentJob');

dotenv.config();

const app = express();

// Middleware global
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(compression());

// ✅ Servir archivos estáticos (PDFs de recibos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/customer-plans', require('./routes/customerPlans'));
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/advance-payments', require('./routes/advancePayments'));
app.use('/api/dunning', require('./routes/dunning'));
app.use('/api/routers', require('./routes/routers'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/mikrotik-profiles', require('./routes/mikrotikProfiles'));
app.use('/api/pppoe', require('./routes/pppoe'));
app.use('/api/reports', require('./routes/reports'));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal' });
});

module.exports = app;
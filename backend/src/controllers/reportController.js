const reportService = require('../services/reportService');
const { generatePaymentReportPdf } = require('../services/reportPdfService');
const prisma = require('../models/prismaClient');

const getPaymentReport = async (req, res) => {
  try {
    const payments = await reportService.reportPayments(req.query);
    res.json(payments);
  } catch (error) {
    console.error('Error en getPaymentReport:', error);
    res.status(400).json({ error: error.message });
  }
};

const downloadPaymentReportPdf = async (req, res) => {
  try {
    const payments = await reportService.reportPayments(req.query);
    
    // Obtener información adicional para los filtros
    const filters = { ...req.query };
    
    if (filters.createdBy) {
      const user = await prisma.user.findUnique({
        where: { id: filters.createdBy },
        select: { name: true },
      });
      if (user) filters.createdByName = user.name;
    }
    
    if (filters.deviceId) {
      const device = await prisma.networkDevice.findUnique({
        where: { id: filters.deviceId },
        select: { name: true },
      });
      if (device) filters.deviceName = device.name;
    }

    const { filePath, fileName } = await generatePaymentReportPdf(payments, filters);
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error al descargar PDF:', err);
        res.status(500).json({ error: 'Error al generar el PDF' });
      }
    });
  } catch (error) {
    console.error('Error en downloadPaymentReportPdf:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPaymentReport,
  downloadPaymentReportPdf,
};


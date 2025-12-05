// backend/src/controllers/reportController.js
const reportService = require('../services/reportService');
const reportPdfService = require('../services/reportPdfService');
const path = require('path');

/**
 * GET /api/reports/payments
 * Obtiene reporte de pagos con filtros
 */
const getPaymentReport = async (req, res) => {
  try {
    const {
      createdBy,
      from,
      to,
      deviceId,
      customerId,
      paymentMethod,
    } = req.query;

    const filters = {
      ...(createdBy && { createdBy }),
      ...(from && { from }),
      ...(to && { to }),
      ...(deviceId && { deviceId }),
      ...(customerId && { customerId }),
      ...(paymentMethod && { paymentMethod }),
    };

    const report = await reportService.reportPayments(filters);

    res.json(report);
  } catch (error) {
    console.error('❌ Error generando reporte de pagos:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/reports/payments/pdf
 * Genera y descarga PDF del reporte de pagos
 */
const downloadPaymentReportPdf = async (req, res) => {
  try {
    const {
      createdBy,
      from,
      to,
      deviceId,
      customerId,
      paymentMethod,
    } = req.query;

    const filters = {
      ...(createdBy && { createdBy }),
      ...(from && { from }),
      ...(to && { to }),
      ...(deviceId && { deviceId }),
      ...(customerId && { customerId }),
      ...(paymentMethod && { paymentMethod }),
    };

    // Obtener datos del reporte
    const reportData = await reportService.reportPayments(filters);

    // Generar PDF
    const { filePath, fileName } = await reportPdfService.generatePaymentReportPdf(
      reportData,
      filters
    );

    // Enviar archivo
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('❌ Error enviando PDF:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al generar el PDF' });
        }
      }
      // Opcional: eliminar el archivo después de enviarlo
      // fs.unlink(filePath, () => {});
    });
  } catch (error) {
    console.error('❌ Error generando PDF de reporte:', error);
    if (!res.headersSent) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = {
  getPaymentReport,
  downloadPaymentReportPdf,
};


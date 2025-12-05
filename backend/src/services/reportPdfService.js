// backend/src/services/reportPdfService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Genera un PDF con el reporte de pagos
 */
async function generatePaymentReportPdf(reportData, filters = {}) {
  const { payments, summary } = reportData;
  const doc = new PDFDocument({ margin: 50 });

  // Crear directorio de salida si no existe
  const outputDir = path.join(__dirname, '../../uploads/reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `reporte-pagos-${Date.now()}.pdf`;
  const filePath = path.join(outputDir, fileName);

  // Pipe del PDF a un archivo
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Encabezado
  doc.fontSize(20).text('Reporte de Pagos', { align: 'center' });
  doc.moveDown();

  // Información de filtros aplicados
  doc.fontSize(12);
  if (filters.from || filters.to) {
    doc.text(`Período: ${filters.from || 'Inicio'} - ${filters.to || 'Hoy'}`);
  }
  if (filters.createdBy) {
    doc.text(`Usuario: ${filters.createdBy}`);
  }
  if (filters.paymentMethod) {
    doc.text(`Método: ${filters.paymentMethod}`);
  }
  doc.moveDown();

  // Resumen
  doc.fontSize(14).text('Resumen', { underline: true });
  doc.fontSize(11);
  doc.text(`Total de pagos: ${summary.totalPayments}`);
  doc.text(`Monto total: S/ ${summary.totalAmount.toFixed(2)}`);
  doc.moveDown();

  // Desglose por método de pago
  if (Object.keys(summary.byMethod).length > 0) {
    doc.fontSize(12).text('Por método de pago:', { underline: true });
    doc.fontSize(10);
    Object.entries(summary.byMethod).forEach(([method, data]) => {
      doc.text(`${method}: ${data.count} pagos - S/ ${data.total.toFixed(2)}`);
    });
    doc.moveDown();
  }

  // Tabla de pagos
  doc.fontSize(14).text('Detalle de Pagos', { underline: true });
  doc.moveDown(0.5);

  // Encabezados de tabla
  const tableTop = doc.y;
  const tableLeft = 50;
  const colWidths = [80, 120, 100, 80, 100, 80];
  
  doc.fontSize(9);
  doc.font('Helvetica-Bold');
  let x = tableLeft;
  ['Fecha', 'Cliente', 'N° Factura', 'Monto', 'Método', 'Usuario'].forEach((header, i) => {
    doc.text(header, x, tableTop, { width: colWidths[i] });
    x += colWidths[i];
  });

  // Línea separadora
  doc.moveTo(tableLeft, doc.y + 5)
     .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), doc.y + 5)
     .stroke();

  // Datos de la tabla
  doc.font('Helvetica');
  let y = doc.y + 10;
  
  payments.forEach((payment, index) => {
    // Nueva página si es necesario
    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    const rowData = [
      new Date(payment.paymentDate).toLocaleDateString('es-PE'),
      payment.customer?.name || 'N/A',
      payment.invoice?.invoiceNumber || 'N/A',
      `S/ ${Number(payment.amount || 0).toFixed(2)}`,
      payment.paymentMethod || 'N/A',
      payment.creator?.name || 'N/A',
    ];

    x = tableLeft;
    rowData.forEach((cell, i) => {
      doc.fontSize(8).text(cell, x, y, { width: colWidths[i] });
      x += colWidths[i];
    });

    y += 20;
  });

  // Pie de página
  doc.fontSize(8);
  doc.text(
    `Generado el: ${new Date().toLocaleString('es-PE')}`,
    50,
    doc.page.height - 50,
    { align: 'center' }
  );

  // Finalizar PDF
  doc.end();

  // Esperar a que el stream termine
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve({
        filePath,
        fileName,
        url: `/uploads/reports/${fileName}`,
      });
    });
    stream.on('error', reject);
  });
}

module.exports = {
  generatePaymentReportPdf,
};


const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { ensureDir } = require('../utils/ensureDir');
const dayjs = require('dayjs');
require('dayjs/locale/es');

const currency = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(n || 0));

const formatDate = (date) => {
  if (!date) return '-';
  return dayjs(date).locale('es').format('DD/MM/YYYY');
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return dayjs(date).locale('es').format('DD/MM/YYYY HH:mm');
};

async function generatePaymentReportPdf(payments, filters = {}) {
  const COLORS = {
    primary: '#1e40af',
    secondary: '#f59e0b',
    text: '#1f2937',
    lightText: '#6b7280',
    border: '#d1d5db',
    headerBg: '#eff6ff',
    totalBg: '#f3f4f6',
    success: '#10b981',
  };

  const logoPath = path.join(process.cwd(), 'src', 'utils', 'LOGO-BRESS.PNG');
  const outDir = path.join(process.cwd(), 'uploads', 'reports');
  ensureDir(outDir);

  const timestamp = dayjs().format('YYYYMMDD_HHmmss');
  const fileName = `Reporte_Pagos_${timestamp}.pdf`;
  const filePath = path.join(outDir, fileName);

  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
    bufferPages: true,
    autoFirstPage: true,
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const pageWidth = doc.page.width - 100;
  let yPos = 50;

  // ========== ENCABEZADO ==========
  doc.rect(50, yPos, pageWidth, 100).fill(COLORS.headerBg);

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 65, yPos + 10, { width: 70, height: 70 });
  }

  doc.fontSize(22)
    .fillColor(COLORS.primary)
    .font('Helvetica-Bold')
    .text('BRESS-LAN', 155, yPos + 12);

  doc.fontSize(8.5)
    .fillColor(COLORS.lightText)
    .font('Helvetica')
    .text('RUC: 10720433678', 155, yPos + 38)
    .text('Av. Marginal SN, Nuevo Progreso', 155, yPos + 50)
    .text('Tingo María, Huánuco, Perú', 155, yPos + 62)
    .text('Tel: 987 121 219 | 942 044 821', 155, yPos + 74)
    .text('ruffnerbruno@gmail.com', 155, yPos + 86);

  const boxRight = doc.page.width - 210;
  const boxWidth = 160;
  doc.rect(boxRight, yPos + 10, boxWidth, 85)
    .lineWidth(2.5)
    .strokeColor(COLORS.primary)
    .stroke();

  doc.fontSize(13)
    .fillColor(COLORS.primary)
    .font('Helvetica-Bold')
    .text('REPORTE DE PAGOS', boxRight + 10, yPos + 16, {
      width: boxWidth - 20,
      align: 'center',
      lineBreak: false,
    });

  doc.fontSize(10)
    .fillColor(COLORS.text)
    .font('Helvetica')
    .text(`Generado: ${formatDateTime(new Date())}`, boxRight + 10, yPos + 40, {
      width: boxWidth - 20,
      align: 'center',
    })
    .text(`Total registros: ${payments.length}`, boxRight + 10, yPos + 55, {
      width: boxWidth - 20,
      align: 'center',
    })
    .text(`Total monto: ${currency(payments.reduce((sum, p) => sum + Number(p.amount), 0))}`, boxRight + 10, yPos + 70, {
      width: boxWidth - 20,
      align: 'center',
    });

  yPos = 170;

  // ========== FILTROS APLICADOS ==========
  if (Object.keys(filters).length > 0) {
    doc.fontSize(10)
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text('Filtros aplicados:', 50, yPos);

    yPos += 15;
    doc.fontSize(9)
      .fillColor(COLORS.lightText)
      .font('Helvetica');

    if (filters.from) {
      doc.text(`Desde: ${formatDate(filters.from)}`, 50, yPos);
      yPos += 12;
    }
    if (filters.to) {
      doc.text(`Hasta: ${formatDate(filters.to)}`, 50, yPos);
      yPos += 12;
    }
    if (filters.createdBy) {
      doc.text(`Usuario: ${filters.createdByName || filters.createdBy}`, 50, yPos);
      yPos += 12;
    }
    if (filters.deviceId) {
      doc.text(`Dispositivo: ${filters.deviceName || filters.deviceId}`, 50, yPos);
      yPos += 12;
    }
    if (filters.paymentMethod) {
      doc.text(`Método: ${filters.paymentMethod}`, 50, yPos);
      yPos += 12;
    }

    yPos += 10;
    doc.moveTo(50, yPos)
      .lineTo(doc.page.width - 50, yPos)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();
    yPos += 15;
  }

  // ========== TABLA DE PAGOS ==========
  const tableTop = yPos;
  const rowHeight = 20;
  const colWidths = {
    fecha: 70,
    numero: 80,
    cliente: 120,
    monto: 70,
    metodo: 70,
    usuario: 80,
    dispositivo: 80,
  };

  const colX = {
    fecha: 50,
    numero: 50 + colWidths.fecha,
    cliente: 50 + colWidths.fecha + colWidths.numero,
    monto: 50 + colWidths.fecha + colWidths.numero + colWidths.cliente,
    metodo: 50 + colWidths.fecha + colWidths.numero + colWidths.cliente + colWidths.monto,
    usuario: 50 + colWidths.fecha + colWidths.numero + colWidths.cliente + colWidths.monto + colWidths.metodo,
    dispositivo: 50 + colWidths.fecha + colWidths.numero + colWidths.cliente + colWidths.monto + colWidths.metodo + colWidths.usuario,
  };

  // Encabezado de tabla
  doc.rect(50, tableTop, pageWidth, rowHeight).fill(COLORS.primary);

  doc.fontSize(8)
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .text('FECHA', colX.fecha + 5, tableTop + 6, { width: colWidths.fecha - 10 })
    .text('NÚMERO', colX.numero + 5, tableTop + 6, { width: colWidths.numero - 10 })
    .text('CLIENTE', colX.cliente + 5, tableTop + 6, { width: colWidths.cliente - 10 })
    .text('MONTO', colX.monto + 5, tableTop + 6, { width: colWidths.monto - 10, align: 'right' })
    .text('MÉTODO', colX.metodo + 5, tableTop + 6, { width: colWidths.metodo - 10 })
    .text('USUARIO', colX.usuario + 5, tableTop + 6, { width: colWidths.usuario - 10 })
    .text('DISPOSITIVO', colX.dispositivo + 5, tableTop + 6, { width: colWidths.dispositivo - 10 });

  yPos = tableTop + rowHeight;

  // Filas de datos
  doc.fillColor(COLORS.text).font('Helvetica');

  payments.forEach((payment, index) => {
    // Verificar si necesitamos una nueva página
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }

    const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
    doc.rect(50, yPos, pageWidth, rowHeight).fill(bgColor);

    doc.fontSize(7)
      .fillColor(COLORS.text)
      .text(formatDate(payment.paymentDate), colX.fecha + 5, yPos + 6, { width: colWidths.fecha - 10 })
      .text(payment.paymentNumber || '-', colX.numero + 5, yPos + 6, { width: colWidths.numero - 10 })
      .text((payment.customer?.name || '-').substring(0, 15), colX.cliente + 5, yPos + 6, { width: colWidths.cliente - 10 })
      .text(currency(payment.amount), colX.monto + 5, yPos + 6, { width: colWidths.monto - 10, align: 'right' })
      .text(payment.paymentMethod || '-', colX.metodo + 5, yPos + 6, { width: colWidths.metodo - 10 })
      .text((payment.creator?.name || '-').substring(0, 10), colX.usuario + 5, yPos + 6, { width: colWidths.usuario - 10 })
      .text((payment.device?.name || '-').substring(0, 10), colX.dispositivo + 5, yPos + 6, { width: colWidths.dispositivo - 10 });

    yPos += rowHeight;
  });

  // Línea final
  doc.moveTo(50, yPos)
    .lineTo(doc.page.width - 50, yPos)
    .strokeColor(COLORS.primary)
    .lineWidth(1.5)
    .stroke();

  yPos += 15;

  // ========== RESUMEN ==========
  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const summaryWidth = 200;
  const summaryX = doc.page.width - 50 - summaryWidth;

  doc.roundedRect(summaryX, yPos, summaryWidth, 60, 3).fill(COLORS.totalBg);

  doc.fontSize(9)
    .fillColor(COLORS.text)
    .font('Helvetica-Bold')
    .text('RESUMEN', summaryX + 10, yPos + 5);

  doc.fontSize(8)
    .fillColor(COLORS.text)
    .font('Helvetica')
    .text(`Total de pagos: ${payments.length}`, summaryX + 10, yPos + 20)
    .text(`Monto total: ${currency(totalAmount)}`, summaryX + 10, yPos + 35);

  // ========== FOOTER ==========
  const footerY = doc.page.height - 50;

  doc.fontSize(7)
    .fillColor(COLORS.lightText)
    .font('Helvetica')
    .text(
      'Este reporte fue generado automáticamente por el sistema BRESS-LAN.',
      50,
      footerY,
      { width: pageWidth, align: 'center' }
    );

  doc.end();
  await new Promise((resolve) => stream.on('finish', resolve));
  return { filePath, fileName };
}

module.exports = { generatePaymentReportPdf };


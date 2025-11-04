const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const prisma = require('../models/prismaClient');
const { ensureDir } = require('../utils/ensureDir');
const { LIMA_TZ } = require('../utils/date');
const dayjs = require('dayjs');
require('dayjs/locale/es');

const currency = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(n || 0));

/**
 * Fuerza a mostrar el mes como "octubre" en el texto de fechas,
 * respetando día (2 dígitos) y año, y usando la TZ de Lima.
 * Ej: "05 de octubre de 2025"
 */
function formatAsOctober(dateInput) {
  const d = new Date(dateInput);
  const dayStr = d.toLocaleString('es-PE', { timeZone: LIMA_TZ, day: '2-digit' });
  const yearStr = d.toLocaleString('es-PE', { timeZone: LIMA_TZ, year: 'numeric' });
  return `${dayStr} de octubre de ${yearStr}`;
}

async function generateInvoicePdf(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, items: true },
  });
  if (!invoice) throw new Error('Factura no encontrada para PDF');

  const customerName = invoice.customer?.name || 'SinNombre';
  const safeCustomerName = customerName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '').trim();

  // 👇 El nombre de archivo permanece basado en el mes real del periodo (NO se fuerza octubre)
  const periodMonth = dayjs(invoice.periodStart).locale('es').format('MMMM_YYYY');
  const fileName = `Factura_${invoice.invoiceNumber}_${periodMonth}.pdf`;

  const outDir = path.join(process.cwd(), 'uploads', 'receipts', safeCustomerName);
  ensureDir(outDir);

  const filePath = path.join(outDir, fileName);

  // ========== DISEÑO PROFESIONAL EMPRESARIAL ==========
  const COLORS = {
    primary: '#1e40af',
    secondary: '#f59e0b',
    text: '#1f2937',
    lightText: '#6b7280',
    border: '#d1d5db',
    headerBg: '#eff6ff',
    totalBg: '#f3f4f6',
    success: '#10b981'
  };

  const logoPath = path.join(process.cwd(), 'src', 'utils', 'LOGO-BRESS.PNG');

  const doc = new PDFDocument({ 
    margin: 50,
    size: 'A4',
    bufferPages: true,
    autoFirstPage: true
  });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // ========== ENCABEZADO ==========
  const pageWidth = doc.page.width - 100;
  let yPos = 50;

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
     .text('COMPROBANTE', boxRight + 10, yPos + 16, { 
       width: boxWidth - 20, 
       align: 'center',
       lineBreak: false
     });
  
  doc.fontSize(12)
     .fillColor(COLORS.text)
     .font('Helvetica-Bold')
     .text(invoice.invoiceNumber, boxRight + 10, yPos + 40, { 
       width: boxWidth - 20, 
       align: 'center',
       lineBreak: false
     });

  // 🔧 FECHA DE EMISIÓN forzada a "octubre"
  const issueDateText = formatAsOctober(invoice.issueDate);

  doc.fontSize(7.5)
     .fillColor(COLORS.lightText)
     .font('Helvetica')
     .text('Fecha de emisión:', boxRight + 10, yPos + 62, { width: boxWidth - 20, align: 'center', lineBreak: false });
  
  doc.fontSize(8.5)
     .fillColor(COLORS.text)
     .font('Helvetica-Bold')
     .text(issueDateText, boxRight + 10, yPos + 74, { width: boxWidth - 20, align: 'center', lineBreak: false });

  yPos += 120;

  // ========== INFO CLIENTE ==========
  doc.moveTo(50, yPos)
     .lineTo(doc.page.width - 50, yPos)
     .strokeColor(COLORS.border)
     .lineWidth(0.5)
     .stroke();

  yPos += 20;

  doc.fontSize(10)
     .fillColor(COLORS.primary)
     .font('Helvetica-Bold')
     .text('DATOS DEL CLIENTE', 50, yPos);

  yPos += 16;

  const clientStartY = yPos;

  doc.fontSize(8.5)
     .fillColor(COLORS.text)
     .font('Helvetica-Bold')
     .text('Nombre:', 50, yPos)
     .font('Helvetica')
     .text(invoice.customer?.name || 'N/A', 110, yPos, { width: 230 });
  
  yPos += 14;

  if (invoice.customer?.documentNumber) {
    doc.font('Helvetica-Bold')
       .text('Documento:', 50, yPos)
       .font('Helvetica')
       .text(invoice.customer.documentNumber, 110, yPos, { width: 230 });
    yPos += 14;
  }

  let rightColY = clientStartY;
  
  if (invoice.customer?.phone) {
    doc.font('Helvetica-Bold')
       .text('Teléfono:', 360, rightColY)
       .font('Helvetica')
       .text(invoice.customer.phone, 415, rightColY);
    rightColY += 14;
  }

  if (invoice.customer?.address) {
    doc.font('Helvetica-Bold')
       .text('Dirección:', 360, rightColY)
       .font('Helvetica')
       .text(invoice.customer.address, 415, rightColY, { width: 135 });
    rightColY += 14;
  }

  yPos = Math.max(yPos, rightColY) + 18;

  // ========== PERIODO FACTURADO ==========
  doc.fontSize(10)
     .fillColor(COLORS.primary)
     .font('Helvetica-Bold')
     .text('PERIODO DE SERVICIO', 50, yPos);

  yPos += 16;

  // 🔧 Periodo mostrado con "octubre" forzado
  const startDateText = formatAsOctober(invoice.periodStart);
  const endDateText = formatAsOctober(invoice.periodEnd);

  doc.fontSize(8.5)
     .fillColor(COLORS.text)
     .font('Helvetica')
     .text(`Del ${startDateText} al ${endDateText}`, 50, yPos);

  yPos += 22;

  // ========== TABLA DETALLE ==========
  doc.fontSize(10)
     .fillColor(COLORS.primary)
     .font('Helvetica-Bold')
     .text('DETALLE DE CONCEPTOS', 50, yPos);

  yPos += 16;

  const tableTop = yPos;
  const rowHeight = 22;

  const colWidths = {
    desc: 280,
    qty: 65,
    unit: 85,
    total: pageWidth - (280 + 65 + 85),
  };

  if (colWidths.total < 60) {
    const deficit = 60 - colWidths.total;
    colWidths.desc = Math.max(200, colWidths.desc - deficit);
    colWidths.total = 60;
  }

  const colX = {
    desc: 50,
    qty: 50 + colWidths.desc,
    unit: 50 + colWidths.desc + colWidths.qty,
    total: 50 + colWidths.desc + colWidths.qty + colWidths.unit
  };

  doc.rect(50, tableTop, pageWidth, rowHeight)
     .fill(COLORS.primary);

  doc.fontSize(8.5)
     .fillColor('#ffffff')
     .font('Helvetica-Bold')
     .text('DESCRIPCIÓN', colX.desc + 8, tableTop + 7, { width: colWidths.desc - 16 })
     .text('CANT.', colX.qty, tableTop + 7, { width: colWidths.qty, align: 'center' })
     .text('P. UNITARIO', colX.unit, tableTop + 7, { width: colWidths.unit, align: 'right' })
     .text('TOTAL', colX.total, tableTop + 7, { width: colWidths.total - 8, align: 'right' });

  yPos = tableTop + rowHeight;

  doc.fillColor(COLORS.text).font('Helvetica');
  
  invoice.items.forEach((item, index) => {
    if (yPos > 720) {
      doc.addPage();
      yPos = 50;
    }

    const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
    
    doc.rect(50, yPos, pageWidth, rowHeight).fill(bgColor);
    
    doc.fontSize(8.5)
       .fillColor(COLORS.text)
       .text(item.description, colX.desc + 8, yPos + 6, { width: colWidths.desc - 16 })
       .text(Number(item.quantity).toFixed(2), colX.qty, yPos + 6, { width: colWidths.qty, align: 'center' })
       .text(currency(item.unitPrice), colX.unit, yPos + 6, { width: colWidths.unit, align: 'right' })
       .text(currency(item.total), colX.total, yPos + 6, { width: colWidths.total - 8, align: 'right' });
    
    yPos += rowHeight;
  });

  doc.moveTo(50, yPos)
     .lineTo(doc.page.width - 50, yPos)
     .strokeColor(COLORS.primary)
     .lineWidth(1.5)
     .stroke();

  yPos += 18;

  // ========== TOTALES ==========
  const rightEdge = 50 + pageWidth;
  const summaryWidth = 170;
  const summaryPadding = 10;
  const summaryOuterWidth = summaryWidth + summaryPadding * 2;

  const summaryOuterX = rightEdge - summaryOuterWidth;
  const summaryX = summaryOuterX + summaryPadding;
  const summaryY = yPos - 8;
  const summaryHeight = 100;

  doc.roundedRect(summaryOuterX, summaryY, summaryOuterWidth, summaryHeight, 3)
    .fill(COLORS.totalBg);

  doc.fontSize(8.5).fillColor(COLORS.text).font('Helvetica');

  let lineY = yPos;
  doc.text('Subtotal:', summaryX, lineY, { width: 70, align: 'left' });
  doc.text(currency(invoice.subtotal), summaryX + 70, lineY, { width: 100, align: 'right' });

  lineY += 16;

  doc.text('IGV (18%):', summaryX, lineY, { width: 70, align: 'left' });
  doc.text(currency(invoice.tax), summaryX + 70, lineY, { width: 100, align: 'right' });

  lineY += 16;

  doc.text('Descuento:', summaryX, lineY, { width: 70, align: 'left' });
  doc.text(currency(invoice.discount), summaryX + 70, lineY, { width: 100, align: 'right' });

  lineY += 22;

  doc.moveTo(summaryX, lineY - 4)
    .lineTo(summaryX + summaryWidth, lineY - 4)
    .strokeColor(COLORS.primary)
    .lineWidth(2)
    .stroke();

  doc.fontSize(12).fillColor(COLORS.primary).font('Helvetica-Bold');
  doc.text('TOTAL:', summaryX, lineY, { width: 70, align: 'left' });
  doc.text(currency(invoice.total), summaryX + 70, lineY, { width: 100, align: 'right' });

  // ========== FOOTER ==========
  const footerY = doc.page.height - 100;

  doc.moveTo(50, footerY)
     .lineTo(doc.page.width - 50, footerY)
     .strokeColor(COLORS.border)
     .lineWidth(1)
     .stroke();

  doc.fontSize(8)
     .fillColor(COLORS.lightText)
     .font('Helvetica')
     .text(
       'NOTA: Este comprobante interno se emite al registrar el pago. No constituye documento tributario válido.',
       50,
       footerY + 15,
       { width: pageWidth, align: 'center', lineBreak: false }
     );

  doc.fontSize(7)
     .text(
       'Gracias por confiar en BRESS-LAN para sus servicios de Internet.',
       50,
       footerY + 30,
       { width: pageWidth, align: 'center', lineBreak: false }
     );

  doc.end();
  await new Promise((resolve) => stream.on('finish', resolve));
  return { filePath, fileName };
}

module.exports = { generateInvoicePdf };

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateInvoice(orderData) {
  const outputDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const filePath = path.join(outputDir, `invoice-${orderData.invoiceNumber}.pdf`);
  const doc = new PDFDocument({ margin: 0, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const padding = 10; // 10mm internal padding for a clean edge-to-edge design

  //––– Logo & Company Info (Elegant Right-Aligned Design)
  const logoPath = path.join(outputDir, 'pecto-logo.png');
  let logoHeight = 70;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, padding, padding, { height: logoHeight });
  }

  const companyInfoX = pageWidth - padding - 200; // Reduced width for elegance
  doc
    .fontSize(10) // Reduced from 14pt for a subtler look
    .fillColor('#2B4455')
    .text('PECTO e.U.', companyInfoX, padding + (logoHeight - 50), { width: 180, align: 'right' })
    .text('info@pecto.at', companyInfoX, padding + (logoHeight - 30), { width: 180, align: 'right' })
    .text('In der Wiesen 13/1/16', companyInfoX, padding + (logoHeight - 10), { width: 180, align: 'right' })
    .text('1230 Wien', companyInfoX, padding + logoHeight + 10, { width: 180, align: 'right' });

  //––– Title (Premium Black with Subtle Accent)
  doc
    .fontSize(28) // Slightly larger for a bold statement
    .fillColor('#1a1a1a') // Dark gray for sophistication, with a hint of gold (#FFD700) underline
    .text('Rechnung', padding, padding + logoHeight + 30)
    .lineWidth(1)
    .moveTo(padding, padding + logoHeight + 55)
    .lineTo(padding + 100, padding + logoHeight + 55)
    .stroke('#FFD700');

  //––– Customer & Invoice Meta (Grid-like, Balanced Layout)
  const infoTop = padding + logoHeight + 80;
  doc
    .fontSize(14)
    .fillColor('#FD6506')
    .text('Kunde:', padding, infoTop)
    .fillColor('#333333')
    .fontSize(12)
    .text(orderData.customer.name, padding, infoTop + 20)
    .text(orderData.customer.address, padding, infoTop + 40)
    .text(`${orderData.customer.zip} ${orderData.customer.city}`, padding, infoTop + 60);

  doc
    .fillColor('#FD6506')
    .text('Rechnungsdetails:', pageWidth / 2 + 20, infoTop) // Adjusted for balance
    .fillColor('#333333')
    .text(`Rechnungsnummer: ${orderData.invoiceNumber}`, pageWidth / 2 + 20, infoTop + 20)
    .text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, pageWidth / 2 + 20, infoTop + 40)
    .text(`Zahlungsart: ${orderData.paymentMethod}`, pageWidth / 2 + 20, infoTop + 60);

  //––– Table (Perfectly Aligned, Premium Design)
  const tableTop = infoTop + 100;
  const colWidths = [250, 70, 100, 100];
  const colPositions = [padding, padding + colWidths[0], padding + colWidths[0] + colWidths[1], padding + colWidths[0] + colWidths[1] + colWidths[2]];

  // Header with Gold Accent
  doc
    .fillColor('#FD6506')
    .rect(padding, tableTop - 5, pageWidth - padding * 2, 30)
    .fill();
  doc
    .fillColor('white')
    .fontSize(12) // Increased for clarity
    .text('Produkt', colPositions[0], tableTop + 5, { width: colWidths[0], align: 'left' })
    .text('Anzahl', colPositions[1], tableTop + 5, { width: colWidths[1], align: 'center' })
    .text('Einzelpreis', colPositions[2], tableTop + 5, { width: colWidths[2], align: 'right' })
    .text('Gesamt', colPositions[3], tableTop + 5, { width: colWidths[3], align: 'right' });

  // Rows with Alternating Backgrounds
  let y = tableTop + 35;
  doc.fillColor('#333333').fontSize(12);
  orderData.items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.rect(padding, y - 5, pageWidth - padding * 2, 30).fill('#f9f9f9');
    }
    doc
      .text(item.name, colPositions[0], y, { width: colWidths[0], align: 'left' })
      .text(item.quantity.toString(), colPositions[1], y, { width: colWidths[1], align: 'center' })
      .text(`€${item.unitPrice.toFixed(2)}`, colPositions[2], y, { width: colWidths[2], align: 'right' })
      .text(`€${item.total.toFixed(2)}`, colPositions[3], y, { width: colWidths[3], align: 'right' });
    doc
      .moveTo(padding, y + 25)
      .lineTo(pageWidth - padding, y + 25)
      .lineWidth(0.5)
      .stroke('#e0e0e0');
    y += 30;
  });

  //––– Totals (Luxury Alignment)
  const subtotal = orderData.items.reduce((sum, i) => sum + i.total, 0);
  const shipping = orderData.shippingCost || 0;
  const discount = orderData.discountAmount || 0;
  const grandTotal = subtotal + shipping - discount;

  y += 20;
  doc
    .fontSize(12)
    .fillColor('#333333')
    .text(`Zwischensumme: €${subtotal.toFixed(2)}`, colPositions[2], y, { width: colWidths[2] + colWidths[3], align: 'right' })
    .text(`Versandkosten: €${shipping.toFixed(2)}`, colPositions[2], y + 20, { width: colWidths[2] + colWidths[3], align: 'right' });
  if (discount > 0) {
    doc.text(`Rabatt: -€${discount.toFixed(2)}`, colPositions[2], y + 40, { width: colWidths[2] + colWidths[3], align: 'right' });
    y += 20;
  }
  doc
    .text(`MwSt (0%): €0.00`, colPositions[2], y + 40, { width: colWidths[2] + colWidths[3], align: 'right' })
    .fillColor('#FFD700') // Gold for a billionaire touch
    .font('Helvetica-Bold')
    .fontSize(18) // Larger for emphasis
    .text(`Gesamtbetrag: €${grandTotal.toFixed(2)}`, colPositions[2], y + 60, { width: colWidths[2] + colWidths[3], align: 'right' });

  //––– Footer (Elegant and Centered)
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#777777')
    .text(
      '*Gemäß § 6 Abs. 1 Z 27 UStG steuerfrei – Kleinunternehmerregelung • ',
      padding,
      pageHeight - padding - 40,
      { width: pageWidth - padding * 2, align: 'center' }
    )
    .fillColor('#FFD700')
    .text('www.pecto.at', { continued: true })
    .fillColor('#777777')
    .text(' • info@pecto.at', { width: pageWidth - padding * 2, align: 'center' });

  doc.end();

  return new Promise(resolve => {
    stream.on('finish', () => resolve(filePath));
  });
}

module.exports = generateInvoice;

// For local testing:
if (require.main === module) {
  generateInvoice({
    customer: {
      name: 'Max Mustermann',
      address: 'Musterstraße 1',
      zip: '1230',
      city: 'Wien'
    },
    items: [
      { name: 'Metallkarte Gold', quantity: 2, unitPrice: 35, total: 70 },
      { name: 'Gravur Rückseite', quantity: 1, unitPrice: 10, total: 10 }
    ],
    invoiceNumber: '1001',
    paymentMethod: 'PayPal',
    shippingCost: 4.49,
    discountAmount: 5.0
  }).then(fp => console.log(`Written to ${fp}`));
}

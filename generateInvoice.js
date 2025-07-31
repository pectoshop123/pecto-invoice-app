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
  const padding = 10; // Internal padding to match 10mm from Puppeteer

  //––– Logo & Company Info
  const logoPath = path.join(outputDir, 'pecto-logo.png');
  let logoHeight = 70;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, padding, padding, { height: logoHeight });
  }

  doc
    .fontSize(16)
    .fillColor('#2B4455')
    .text('PECTO e.U.', pageWidth - padding - 150, padding + (logoHeight - 60))
    .text('info@pecto.at', pageWidth - padding - 150, padding + (logoHeight - 40))
    .text('In der Wiesen 13/1/16', pageWidth - padding - 150, padding + (logoHeight - 20))
    .text('1230 Wien', pageWidth - padding - 150, padding + (logoHeight));

  //––– Title
  doc
    .fontSize(24)
    .fillColor('#FD6506')
    .text('Rechnung', padding, padding + logoHeight + 20);

  //––– Customer & Invoice Meta (Grid-like)
  const infoTop = padding + logoHeight + 60;
  doc
    .fontSize(13)
    .fillColor('#FD6506')
    .text('Kunde:', padding, infoTop, { continued: true })
    .fillColor('#333333')
    .text(orderData.customer.name, padding, infoTop + 20)
    .text(orderData.customer.address, padding, infoTop + 40)
    .text(`${orderData.customer.zip} ${orderData.customer.city}`, padding, infoTop + 60);

  doc
    .fillColor('#FD6506')
    .text('Rechnungsdetails:', pageWidth / 2, infoTop, { continued: true })
    .fillColor('#333333')
    .text(`Rechnungsnummer: ${orderData.invoiceNumber}`, pageWidth / 2, infoTop + 20)
    .text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, pageWidth / 2, infoTop + 40)
    .text(`Zahlungsart: ${orderData.paymentMethod}`, pageWidth / 2, infoTop + 60);

  //––– Table
  const tableTop = infoTop + 100;
  const colWidths = [250, 70, 100, 100];
  const colPositions = [padding, padding + colWidths[0], padding + colWidths[0] + colWidths[1], padding + colWidths[0] + colWidths[1] + colWidths[2]];

  // Header
  doc
    .fillColor('#FD6506')
    .rect(padding, tableTop - 5, pageWidth - padding * 2, 25)
    .fill();
  doc
    .fillColor('white')
    .fontSize(10)
    .text('Produkt', colPositions[0], tableTop)
    .text('Anzahl', colPositions[1], tableTop)
    .text('Einzelpreis', colPositions[2], tableTop)
    .text('Gesamt', colPositions[3], tableTop);

  // Rows
  let y = tableTop + 30;
  doc.fillColor('#333333').fontSize(10);
  orderData.items.forEach(item => {
    doc
      .text(item.name, colPositions[0], y)
      .text(item.quantity.toString(), colPositions[1], y, { width: colWidths[1], align: 'center' })
      .text(`€${item.unitPrice.toFixed(2)}`, colPositions[2], y, { width: colWidths[2], align: 'right' })
      .text(`€${item.total.toFixed(2)}`, colPositions[3], y, { width: colWidths[3], align: 'right' });
    doc
      .moveTo(padding, y + 20)
      .lineTo(pageWidth - padding, y + 20)
      .lineWidth(1)
      .stroke('#e0e0e0');
    y += 30;
  });

  //––– Totals
  const subtotal = orderData.items.reduce((sum, i) => sum + i.total, 0);
  const shipping = orderData.shippingCost || 0;
  const discount = orderData.discountAmount || 0;
  const grandTotal = subtotal + shipping - discount;

  y += 10;
  doc
    .fontSize(10)
    .fillColor('#333333')
    .text(`Zwischensumme: €${subtotal.toFixed(2)}`, colPositions[2], y, { width: colWidths[2] + colWidths[3], align: 'right' })
    .text(`Versandkosten: €${shipping.toFixed(2)}`, colPositions[2], y + 15, { width: colWidths[2] + colWidths[3], align: 'right' });
  if (discount > 0) {
    doc.text(`Rabatt: -€${discount.toFixed(2)}`, colPositions[2], y + 30, { width: colWidths[2] + colWidths[3], align: 'right' });
    y += 15;
  }
  doc
    .text(`MwSt (0%): €0.00`, colPositions[2], y + 30, { width: colWidths[2] + colWidths[3], align: 'right' })
    .fillColor('#FD6506')
    .font('Helvetica-Bold')
    .text(`Gesamtbetrag: €${grandTotal.toFixed(2)}`, colPositions[2], y + 45, { width: colWidths[2] + colWidths[3], align: 'right' });

  //––– Footer
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#777777')
    .text(
      '*Gemäß § 6 Abs. 1 Z 27 UStG steuerfrei – Kleinunternehmerregelung • www.pecto.at • info@pecto.at',
      padding,
      pageHeight - padding - 20,
      { width: pageWidth - padding * 2, align: 'center' }
    );

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

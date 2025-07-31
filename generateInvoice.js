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
  const padding = 20; // Premium spacing

  //––– Logo & Company Info (More Elegant Design)
  const logoPath = path.join(outputDir, 'pecto-logo.png');
  let logoHeight = 50;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, padding, padding, { height: logoHeight });
  }

  const companyInfoX = pageWidth - padding - 180;
  doc
    .fontSize(10) // Reduced for beauty
    .fillColor('#2B4455')
    .font('Helvetica')
    .text('PECTO e.U.', companyInfoX, padding + 5, { width: 160, align: 'right' })
    .text('info@pecto.at', companyInfoX, padding + 25, { width: 160, align: 'right' }) // Increased spacing
    .text('In der Wiesen 13/1/16', companyInfoX, padding + 40, { width: 160, align: 'right' })
    .text('1230 Wien', companyInfoX, padding + 55, { width: 160, align: 'right' });

  //––– Title (Subtle Medium Gray, Regular Weight)
  doc
    .fontSize(26)
    .fillColor('#333333') // Medium gray for elegance
    .font('Helvetica') // Regular weight, not bold
    .text('Rechnung', padding, padding + logoHeight + 20);

  //––– Header Line with Gold Accent for Billion-Dollar Touch
  doc
    .moveTo(padding, padding + logoHeight + 60)
    .lineTo(pageWidth - padding, padding + logoHeight + 60)
    .lineWidth(1)
    .stroke('#FFD700');

  //––– Customer & Invoice Meta (Balanced Grid)
  const infoTop = padding + logoHeight + 80;
  doc
    .fontSize(12)
    .fillColor('#FD6506')
    .text('Kunde:', padding, infoTop)
    .fillColor('#333333')
    .fontSize(11)
    .text(orderData.customer.name, padding, infoTop + 15)
    .text(orderData.customer.address, padding, infoTop + 30)
    .text(`${orderData.customer.zip} ${orderData.customer.city}`, padding, infoTop + 45);

  doc
    .fillColor('#FD6506')
    .text('Rechnungsdetails:', pageWidth / 2, infoTop)
    .fillColor('#333333')
    .text(`Rechnungsnummer: ${orderData.invoiceNumber}`, pageWidth / 2, infoTop + 15)
    .text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, pageWidth / 2, infoTop + 30)
    .text(`Zahlungsart: ${orderData.paymentMethod}`, pageWidth / 2, infoTop + 45);

  //––– Table (Fixed Alignment for Products)
  const tableTop = infoTop + 70;
  const colWidths = [350, 80, 110, 110]; // Widened product column to 350px
  const colPositions = [padding, padding + colWidths[0], padding + colWidths[0] + colWidths[1], padding + colWidths[0] + colWidths[1] + colWidths[2]];

  // Header
  doc
    .fillColor('#FD6506')
    .rect(padding, tableTop - 5, pageWidth - padding * 2, 25)
    .fill();
  doc
    .fillColor('white')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Produkt', colPositions[0] + 5, tableTop + 2, { width: colWidths[0] - 10, align: 'left' })
    .text('Anzahl', colPositions[1] + 5, tableTop + 2, { width: colWidths[1] - 10, align: 'center' })
    .text('Einzelpreis', colPositions[2] + 5, tableTop + 2, { width: colWidths[2] - 10, align: 'right' })
    .text('Gesamt', colPositions[3] + 5, tableTop + 2, { width: colWidths[3] - 10, align: 'right' });

  // Rows with Improved Alignment
  let y = tableTop + 25;
  doc.fillColor('#333333').fontSize(11).font('Helvetica');
  orderData.items.forEach((item, index) => {
    const rowFill = index % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc
      .rect(padding, y - 5, pageWidth - padding * 2, 25)
      .fill(rowFill);
    // Product with wrapping and padding
    doc
      .text(item.name, colPositions[0] + 5, y, { width: colWidths[0] - 15, align: 'left', lineBreak: true, lineGap: 3 })
      .text(item.quantity.toString(), colPositions[1] + 5, y, { width: colWidths[1] - 10, align: 'center' })
      .text(`€${item.unitPrice.toFixed(2)}`, colPositions[2] + 5, y, { width: colWidths[2] - 10, align: 'right' })
      .text(`€${item.total.toFixed(2)}`, colPositions[3] + 5, y, { width: colWidths[3] - 10, align: 'right' });
    if (index < orderData.items.length - 1) {
      doc
        .moveTo(padding, y + 20)
        .lineTo(pageWidth - padding, y + 20)
        .lineWidth(0.5)
        .stroke('#e0e0e0');
    }
    y += 25; // Consistent row height
  });

  //––– Totals (Less Bold, Aligned)
  const subtotal = orderData.items.reduce((sum, i) => sum + i.total, 0);
  const shipping = orderData.shippingCost || 0;
  const discount = orderData.discountAmount || 0;
  const grandTotal = subtotal + shipping - discount;

  y += 20;
  doc
    .fontSize(11)
    .fillColor('#333333')
    .text(`Zwischensumme: €${subtotal.toFixed(2)}`, colPositions[2], y, { width: colWidths[2] + colWidths[3], align: 'right' })
    .text(`Versandkosten: €${shipping.toFixed(2)}`, colPositions[2], y + 15, { width: colWidths[2] + colWidths[3], align: 'right' });
  if (discount > 0) {
    doc.text(`Rabatt: -€${discount.toFixed(2)}`, colPositions[2], y + 30, { width: colWidths[2] + colWidths[3], align: 'right' });
    y += 15;
  }
  doc
    .text(`MwSt (0%): €0.00`, colPositions[2], y + 30, { width: colWidths[2] + colWidths[3], align: 'right' })
    .fillColor('#333333') // Lighter black for subtlety
    .font('Helvetica') // Regular weight
    .fontSize(16)
    .text(`Gesamtbetrag: €${grandTotal.toFixed(2)}`, colPositions[2], y + 45, { width: colWidths[2] + colWidths[3], align: 'right' });

  //––– Footer (Refined, Centered)
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#777777')
    .text(
      '*Gemäß § 6 Abs. 1 Z 27 UStG steuerfrei – Kleinunternehmerregelung',
      padding,
      pageHeight - padding - 40,
      { width: pageWidth - padding * 2, align: 'center' }
    )
    .text(
      'www.pecto.at • info@pecto.at',
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

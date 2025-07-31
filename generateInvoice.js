const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateInvoice(orderData) {
  const outputDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const filePath = path.join(
    outputDir,
    `invoice-${orderData.invoiceNumber}.pdf`
  );
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  //––– Logo & Header
  const logoPath = path.join(outputDir, 'pecto-logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 40, { width: 100 });
  }
  doc
    .fontSize(20)
    .fillColor('#FD6506')
    .text('Rechnung', 450, 50, { align: 'right' });

  //––– Company Info
  doc
    .fontSize(10)
    .fillColor('#2B4455')
    .text('PECTO e.U.', 450, 80, { align: 'right' })
    .text('info@pecto.at', { align: 'right' })
    .text('In der Wiesen 13/1/16', { align: 'right' })
    .text('1230 Wien', { align: 'right' })
    .moveDown();

  //––– Customer & Meta
  doc
    .fontSize(12)
    .fillColor('#333')
    .text(`Kunde:\n${orderData.customer.name}\n${orderData.customer.address}\n${orderData.customer.zip} ${orderData.customer.city}`, 40, 150)
    .text(
      `Rechnungsnummer: ${orderData.invoiceNumber}\nDatum: ${new Date().toLocaleDateString('de-DE')}\nZahlungsart: ${orderData.paymentMethod}`,
      350,
      150
    )
    .moveDown(2);

  //––– Table Header
  const tableTop = 240;
  doc
    .fontSize(10)
    .fillColor('white')
    .rect(40, tableTop, 515, 20)
    .fill('#FD6506');
  doc
    .fillColor('white')
    .text('Produkt', 45, tableTop + 5)
    .text('Anzahl', 260, tableTop + 5)
    .text('Einzelpreis', 330, tableTop + 5)
    .text('Gesamt', 430, tableTop + 5);

  //––– Table Rows
  let y = tableTop + 25;
  doc.fillColor('#333').fontSize(10);
  orderData.items.forEach(item => {
    doc
      .text(item.name, 45, y)
      .text(item.quantity.toString(), 260, y)
      .text(`€${item.unitPrice.toFixed(2)}`, 330, y)
      .text(`€${item.total.toFixed(2)}`, 430, y);
    y += 20;
  });

  //––– Totals
  const subtotal = orderData.items.reduce((sum, i) => sum + i.total, 0);
  const shipping = orderData.shippingCost || 0;
  const discount = orderData.discountAmount || 0;
  const grandTotal = subtotal + shipping - discount;

  y += 20;
  doc
    .fontSize(10)
    .text(`Zwischensumme: €${subtotal.toFixed(2)}`, 350, y)
    .text(`Versandkosten: €${shipping.toFixed(2)}`, 350, y + 15);
  if (discount > 0) {
    doc.text(`Rabatt: -€${discount.toFixed(2)}`, 350, y + 30);
  }
  doc
    .font('Helvetica-Bold')
    .text(`Gesamtbetrag: €${grandTotal.toFixed(2)}`, 350, y + 45);

  //––– Footer
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#777')
    .text(
      '*Gemäß § 6 Abs. 1 Z 27 UStG steuerfrei – Kleinunternehmerregelung • www.pecto.at • info@pecto.at',
      40,
      780,
      { width: 515, align: 'center' }
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

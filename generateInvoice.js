// generateInvoice.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateInvoice(orderData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const padding = 42.5; // Approx 15mm (1mm = 2.834pt)

    // Logo & Company Info
    const logoPath = path.join(__dirname, 'pecto-logo.png');
    let logoHeight = 80;
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, padding, padding, { height: logoHeight });
    }

    const companyInfoX = pageWidth - padding - 200;
    doc
      .fontSize(12)
      .fillColor('#4a4a4a')
      .text('PECTO e.U.', companyInfoX, padding + 5, { align: 'right' })
      .text('info@pecto.at', companyInfoX, padding + 25, { align: 'right' })
      .text('In der Wiesen 13/1/16', companyInfoX, padding + 40, { align: 'right' })
      .text('1230 Wien', companyInfoX, padding + 55, { align: 'right' });

    // Header Line
    doc
      .moveTo(padding, padding + logoHeight + 60)
      .lineTo(pageWidth - padding, padding + logoHeight + 60)
      .lineWidth(1)
      .stroke('#e0e0e0');

    // Title
    doc
      .fontSize(28)
      .fillColor('#FD6506')
      .text('Rechnung', padding, padding + logoHeight + 70, { lineGap: 5 });

    // Info Grid
    const infoTop = padding + logoHeight + 120;
    doc
      .fontSize(14)
      .fillColor('#FD6506')
      .text('Kunde:', padding, infoTop)
      .fillColor('#1a1a1a')
      .text(orderData.customer.name, padding, infoTop + 20)
      .text(orderData.customer.address, padding, infoTop + 35)
      .text(`${orderData.customer.zip} ${orderData.customer.city}`, padding, infoTop + 50);

    doc
      .fillColor('#FD6506')
      .text('Rechnungsdetails:', pageWidth / 2, infoTop)
      .fillColor('#1a1a1a')
      .text(`Rechnungsnummer: ${orderData.invoiceNumber}`, pageWidth / 2, infoTop + 20)
      .text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, pageWidth / 2, infoTop + 35)
      .text(`Zahlungsart: ${orderData.paymentMethod}`, pageWidth / 2, infoTop + 50);

    // Table
    const tableTop = infoTop + 90;
    const colWidths = [350, 80, 110, 110];
    const colPositions = [padding, padding + colWidths[0], padding + colWidths[0] + colWidths[1], padding + colWidths[0] + colWidths[1] + colWidths[2]];

    // Header
    doc
      .fillColor('#FD6506')
      .rect(padding, tableTop - 5, pageWidth - padding * 2, 25)
      .fill();
    doc
      .fillColor('white')
      .fontSize(12)
      .text('Produkt', colPositions[0] + 5, tableTop)
      .text('Anzahl', colPositions[1] + 5, tableTop, { align: 'center' })
      .text('Einzelpreis', colPositions[2] + 5, tableTop, { align: 'right' })
      .text('Gesamt', colPositions[3] + 5, tableTop, { align: 'right' });

    // Rows
    let y = tableTop + 25;
    doc.fillColor('#1a1a1a').fontSize(12);
    orderData.items.forEach((item, index) => {
      const rowFill = index % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc
        .rect(padding, y - 5, pageWidth - padding * 2, 25)
        .fill(rowFill);
      doc
        .text(item.name, colPositions[0] + 5, y, { width: colWidths[0] - 10, align: 'left' })
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
      y += 25;
    });

    // Totals
    y += 20;
    doc
      .fontSize(14)
      .fillColor('#1a1a1a')
      .text(`Zwischensumme: €${subtotal.toFixed(2)}`, colPositions[2], y, { align: 'right' })
      .text(`Versandkosten: €${shipping.toFixed(2)}`, colPositions[2], y + 20, { align: 'right' });
    if (discount > 0) {
      doc.text(`Rabatt: -€${discount.toFixed(2)}`, colPositions[2], y + 40, { align: 'right' });
      y += 20;
    }
    doc
      .text(`MwSt (0%): €0.00`, colPositions[2], y + 40, { align: 'right' })
      .fillColor('#FD6506')
      .font('Helvetica-Bold')
      .text(`Gesamtbetrag: €${grandTotal.toFixed(2)}`, colPositions[2], y + 60, { align: 'right' });

    // Footer
    doc
      .fontSize(11)
      .fillColor('#777777')
      .text('*Gemäß § 6 Abs. 1 Z 27 UStG steuerfrei – Kleinunternehmerregelung', padding, pageHeight - padding - 60, { width: pageWidth - padding * 2, align: 'center' })
      .text('www.pecto.at • info@pecto.at', padding, pageHeight - padding - 40, { width: pageWidth - padding * 2, align: 'center' });

    doc.end();
  });
}

module.exports = { generateInvoice };

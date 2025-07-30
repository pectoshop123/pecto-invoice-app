const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateInvoice(orderData) {
  const outputDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const invoiceFile = path.join(outputDir, `invoice-${orderData.invoiceNumber}.pdf`);
  const logoPath = path.join(outputDir, 'pecto-logo.png');
  const logoData = fs.readFileSync(logoPath).toString('base64');

  const subtotal = orderData.items.reduce((sum, i) => sum + i.total, 0);
  const shipping = orderData.shippingCost || 0;
  const discount = orderData.discountAmount || 0;
  const grandTotal = subtotal + shipping - discount;

  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8" />
      <title>Rechnung</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        @page {
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Roboto', sans-serif;
          padding: 10mm;
          font-size: 14px;
          color: #333333;
          line-height: 1.5;
          background-color: #ffffff;
        }
        .container {
          padding: 10px;
          background-color: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .logo {
          max-height: 70px;
        }
        .company-info {
          text-align: right;
          color: #2B4455;
        }
        .company-info strong {
          font-size: 16px;
          color: #FD6506;
        }
        h1 {
          color: #FD6506;
          font-size: 24px;
          font-weight: 500;
          margin-bottom: 15px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .customer-info, .invoice-meta {
          font-size: 13px;
        }
        .customer-info strong, .invoice-meta strong {
          display: block;
          margin-bottom: 5px;
          color: #FD6506;
          font-weight: 500;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #FD6506;
          color: white;
          padding: 10px;
          text-align: left;
          font-weight: 500;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        tr:last-child td {
          border-bottom: none;
        }
        .total {
          text-align: right;
          font-weight: 500;
          color: #333333;
        }
        .total strong {
          color: #FD6506;
          font-size: 16px;
        }
        .footer {
          margin-top: 20px;
          font-size: 11px;
          color: #777777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <img src="data:image/png;base64,${logoData}" class="logo" />
          </div>
          <div class="company-info">
            <strong>PECTO e.U.</strong><br />
            info@pecto.at<br />
            In der Wiesen 13/1/16<br />
            1230 Wien
          </div>
        </div>

        <h1>Rechnung</h1>

        <div class="info-grid">
          <div class="customer-info">
            <strong>Kunde:</strong>
            ${orderData.customer.name}<br />
            ${orderData.customer.address}<br />
            ${orderData.customer.zip} ${orderData.customer.city}
          </div>
          <div class="invoice-meta">
            <strong>Rechnungsdetails:</strong>
            Rechnungsnummer: ${orderData.invoiceNumber}<br />
            Datum: ${new Date().toLocaleDateString('de-DE')}<br />
            Zahlungsart: ${orderData.paymentMethod}
          </div>
        </div>

        <table>
          <tr>
            <th>Produkt</th>
            <th>Anzahl</th>
            <th>Einzelpreis</th>
            <th>Gesamt</th>
          </tr>
          ${orderData.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>€${item.unitPrice.toFixed(2)}</td>
            <td>€${item.total.toFixed(2)}</td>
          </tr>`).join('')}
        </table>

        <div class="total">
          Zwischensumme: €${subtotal.toFixed(2)}<br />
          Versandkosten: €${shipping.toFixed(2)}<br />
          ${discount > 0 ? `Rabatt: -€${discount.toFixed(2)}<br />` : ''}
          MwSt (0%): €0,00<br />
          <strong>Gesamtbetrag: €${grandTotal.toFixed(2)}</strong>
        </div>

        <div class="footer">
          *Gemäß § 6 Abs. 1 Z 27 UStG steuerfrei – Kleinunternehmerregelung<br />
          www.pecto.at • info@pecto.at
        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: invoiceFile, format: 'A4', printBackground: true, margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' } });
  await browser.close();

  console.log(`✅ PDF erstellt: ${invoiceFile}`);
}

module.exports = generateInvoice;

// Example run
if (require.main === module) {
  const sampleData = {
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
    discountAmount: 5.00
  };

  generateInvoice(sampleData);
}

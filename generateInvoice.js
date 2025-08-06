const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateInvoice(orderData) {
  const outputDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  const invoiceFile = path.join(outputDir, `invoice-${orderData.invoiceNumber}.pdf`);
  const logoPath = path.join(outputDir, 'pecto-logo.png');
  let logoData;
  try {
    logoData = fs.readFileSync(logoPath).toString('base64');
  } catch (err) {
    console.error('Logo file not found:', err.message);
    logoData = ''; // Placeholder to avoid crash
  }
  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8" />
      <title>Rechnung</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Roboto', sans-serif;
          margin: 40px;
          font-size: 14px;
          color: #333333;
          line-height: 1.5;
          background-color: #ffffff;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background-color: #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
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
          margin-bottom: 20px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
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
          margin-bottom: 30px;
        }
        th {
          background-color: #FD6506;
          color: white;
          padding: 12px 10px;
          text-align: left;
          font-weight: 500;
        }
        td {
          padding: 12px 10px;
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
          margin-top: 40px;
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
          Zwischensumme: €${orderData.items.reduce((sum, i) => sum + i.total, 0).toFixed(2)}<br />
          MwSt (0%): €0,00<br />
          <strong>Gesamtbetrag: €${orderData.items.reduce((sum, i) => sum + i.total, 0).toFixed(2)}</strong>
        </div>
        <div class="footer">
          *Gemäß § 6 Abs. 1 Z 27 UStG steuerfrei – Kleinunternehmerregelung<br />
          www.pecto.at • info@pecto.at
        </div>
      </div>
    </body>
    </html>
  `;

  // Server-compatible launch options
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: invoiceFile, format: 'A4', printBackground: true });
  await browser.close();
  console.log(`✅ PDF erstellt: ${invoiceFile}`);
  return invoiceFile; // Return the path for server.js
}

module.exports = generateInvoice;

// Example run (for local testing only)
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
    paymentMethod: 'PayPal'
  };
  generateInvoice(sampleData);
}

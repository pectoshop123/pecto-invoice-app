// generateInvoice.js
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

let browserInstance = null;

async function launchBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser', // Fallback path for Render
      headless: 'new',
    });
  }
  return browserInstance;
}

async function generateInvoice(orderData, browser) {
  const outputDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const logoPath = path.join(__dirname, 'pecto-logo.png');
  let logoData = '';
  try {
    if (fs.existsSync(logoPath)) {
      logoData = fs.readFileSync(logoPath).toString('base64');
    } else {
      console.warn('Logo not found at:', logoPath);
    }
  } catch (error) {
    console.error('Error reading logo:', error.message);
  }

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        @page {
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Inter', sans-serif;
          padding: 15mm;
          font-size: 14px;
          color: #1a1a1a;
          line-height: 1.6;
          background-color: #f9f9f9;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.05);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e0e0e0;
        }
        .logo {
          max-height: 80px;
        }
        .company-info {
          text-align: right;
          color: #4a4a4a;
        }
        .company-info strong {
          font-size: 18px;
          color: #FD6506;
          display: block;
          margin-bottom: 10px;
        }
        h1 {
          color: #FD6506;
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 30px;
          letter-spacing: 0.5px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }
        .customer-info, .invoice-meta {
          font-size: 14px;
        }
        .customer-info strong, .invoice-meta strong {
          display: block;
          margin-bottom: 10px;
          color: #FD6506;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        th {
          background-color: #FD6506;
          color: white;
          padding: 15px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 15px;
          border-bottom: 1px solid #e0e0e0;
          text-align: left;
        }
        td:nth-child(2) {
          text-align: center;
        }
        td:nth-child(3), td:nth-child(4) {
          text-align: right;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .total {
          text-align: right;
          font-weight: 600;
          color: #1a1a1a;
          font-size: 14px;
          background-color: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .total strong {
          color: #FD6506;
          font-size: 18px;
          display: block;
          margin-top: 10px;
        }
        .footer {
          margin-top: 40px;
          font-size: 11px;
          color: #777777;
          text-align: center;
          border-top: 1px solid #e0e0e0;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoData ? `<img src="data:image/png;base64,${logoData}" class="logo" />` : '<div style="height: 80px;"></div>'}
          <div class="company-info">
            <strong>PECTO e.U.</strong>
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

  // Launch browser and generate PDF
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();

  return pdfBuffer; // Return buffer instead of saving to file
}

module.exports = { generateInvoice, launchBrowser };

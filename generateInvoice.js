const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateInvoice(orderData) {
  const outputDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const invoiceFile = path.join(outputDir, `invoice-${orderData.invoiceNumber}.pdf`);
  const logoPath = path.join(outputDir, 'pecto-logo.png');

  if (!fs.existsSync(logoPath)) {
    throw new Error(`Logo file not found at ${logoPath}`);
  }

  const logoData = fs.readFileSync(logoPath).toString('base64');

  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8" />
      <title>Rechnung</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        /* [Styles omitted for brevity — keep your original styles here as-is] */
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
          Versandkosten: €${orderData.shippingCost ? orderData.shippingCost.toFixed(2) : '0.00'}<br />
          ${orderData.discountAmount ? `Rabatt: -€${orderData.discountAmount.toFixed(2)}<br />` : ''}
          MwSt (0%): €0,00<br />
          <strong>Gesamtbetrag: €${(orderData.items.reduce((sum, i) => sum + i.total, 0) + (orderData.shippingCost || 0) - (orderData.discountAmount || 0)).toFixed(2)}</strong>
        </div>
        <div class="footer">
          *Gemäß § 6 Abs. 1 Z 27 UStG steuerfrei – Kleinunternehmerregelung<br />
          www.pecto.at • info@pecto.at
        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new',
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: invoiceFile, format: 'A4', printBackground: true });
  await browser.close();

  console.log(`✅ PDF erstellt: ${invoiceFile}`);

  return invoiceFile;
}

module.exports = generateInvoice;

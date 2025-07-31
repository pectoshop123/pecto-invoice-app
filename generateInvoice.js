// generateInvoice.js
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function generateInvoice(orderData) {
  // ensure output folder
  const outputDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  // set up filenames
  const invoiceFile = path.join(outputDir, `invoice-${orderData.invoiceNumber}.pdf`);
  const logoPath    = path.join(outputDir, 'pecto-logo.png');

  if (!fs.existsSync(logoPath)) {
    throw new Error('Logo not found: invoices/pecto-logo.png');
  }

  // read & base64 encode logo
  const logoData = fs.readFileSync(logoPath).toString('base64');

  // calculate totals
  const subtotal  = orderData.items.reduce((sum, i) => sum + i.total, 0);
  const shipping  = Number(orderData.shippingCost)   || 0;
  const discount  = Number(orderData.discountAmount) || 0;
  const grandTotal = subtotal + shipping - discount;

  // build the HTML
  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <title>Rechnung ${orderData.invoiceNumber}</title>
      <style>
        /* … all your existing styles here … */
      </style>
    </head>
    <body>
      <!-- header, customer info, table -->
      <div class="total">
        Zwischensumme: €${subtotal.toFixed(2)}<br/>
        Versandkosten: €${shipping.toFixed(2)}<br/>
        ${discount > 0 ? `Rabatt: -€${discount.toFixed(2)}<br/>` : ''}
        MwSt (0%): €0,00<br/>
        <strong>Gesamtbetrag: €${grandTotal.toFixed(2)}</strong>
      </div>
      <!-- footer -->
    </body>
    </html>
  `;

  // launch the system chrome installed via Aptfile
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: invoiceFile,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  await browser.close();

  console.log(`✅ PDF created at ${invoiceFile}`);
}

module.exports = generateInvoice;

// If run directly:
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

  generateInvoice(sampleData).catch(console.error);
}

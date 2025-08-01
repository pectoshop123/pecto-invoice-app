const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateInvoice(orderData) {
  const outputDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const invoiceFile = path.join(outputDir, `invoice-${orderData.invoiceNumber}.pdf`);
  const logoPath = path.join(outputDir, 'invoices', 'pecto-logo.png');
  const logoData = fs.readFileSync(logoPath).toString('base64');

  const subtotal = orderData.items.reduce((sum, i) => sum + i.total, 0);
  const shipping = orderData.shippingCost || 0;
  const discount = orderData.discountAmount || 0;
  const grandTotal = subtotal + shipping - discount;

  const html = `
    <!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/>
    <title>Rechnung</title><style>
      /* your CSS here… (the long block you shared) */
    </style></head><body>
      <div class="container">…your HTML with ${logoData} and orderData…</div>
    </body></html>
  `;

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium', 
    args: ['--no-sandbox','--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: invoiceFile,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
  });
  await browser.close();
  return invoiceFile;
}

module.exports = generateInvoice;

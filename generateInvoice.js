const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

module.exports = async function generateInvoice(orderData) {
  const outDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const file = path.join(outDir, `Rechnung_${orderData.invoiceNumber}.pdf`);
  const logoPath = path.join(outDir, 'pecto-logo.png');

  let logoData = '';
  try { logoData = fs.readFileSync(logoPath).toString('base64'); }
  catch { console.warn('ℹ️ No logo found at invoices/pecto-logo.png'); }

  const { totals } = orderData;
  const rows = orderData.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td class="c">${i.quantity}</td>
      <td class="r">€${Number(i.unitPrice).toFixed(2)}</td>
      <td class="r">€${Number(i.total ?? i.quantity * i.unitPrice).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><title>Rechnung ${orderData.invoiceNumber}</title>
<style>
  *{box-sizing:border-box} body{font-family:Helvetica,Arial,sans-serif;color:#333;margin:30px}
  .wrap{max-width:800px;margin:0 auto}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
  .logo{max-height:72px}
  .company{color:#2B4455;text-align:right}
  .company strong{color:#FD6506;font-size:16px}
  h1{color:#FD6506;font-weight:600;margin:10px 0 16px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:10px 0 16px}
  .box strong{color:#FD6506}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th{background:#FD6506;color:#fff;text-align:left;padding:10px;font-weight:600}
  td{padding:10px;border-bottom:1px solid #eee}
  .r{text-align:right}.c{text-align:center}
  .totals{margin-top:10px}
  .totals .row{display:flex;justify-content:space-between;padding:6px 0}
  .totals .sum{font-weight:700;color:#FD6506;border-top:1px solid #eee;padding-top:10px}
  .foot{margin-top:28px;font-size:11px;color:#777;text-align:center}
</style></head>
<body><div class="wrap">
  <div class="header">
    <div>${logoData ? `<img class="logo" src="data:image/png;base64,${logoData}" />` : ''}</div>
    <div class="company"><strong>PECTO e.U.</strong><br/>info@pecto.at<br/>In der Wiesen 13/1/16<br/>1230 Wien</div>
  </div>
  <h1>Rechnung</h1>
  <div class="grid">
    <div class="box"><strong>Kunde</strong><br/>${orderData.customer.name}<br/>${orderData.customer.address || ''}<br/>${orderData.customer.zip || ''} ${orderData.customer.city || ''}</div>
    <div class="box"><strong>Details</strong><br/>Nr.: ${orderData.invoiceNumber}<br/>Datum: ${new Date().toLocaleDateString('de-AT')}<br/>Zahlung: ${orderData.paymentMethod || '—'}</div>
  </div>
  <table>
    <thead><tr><th>Produkt</th><th class="c">Anzahl</th><th class="r">Einzelpreis</th><th class="r">Gesamt</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Zwischensumme</span><span>€${totals.subtotal.toFixed(2)}</span></div>
    <div class="row"><span>Versand</span><span>€${totals.shipping.toFixed(2)}</span></div>
    <div class="row"><span>Rabatt</span><span>-€${totals.discount.toFixed(2)}</span></div>
    <div class="row sum"><span>Gesamt</span><span>€${totals.grandTotal.toFixed(2)}</span></div>
  </div>
  <div class="foot">Kleinunternehmerregelung gem. § 6 Abs. 1 Z 27 UStG – keine USt. ausgewiesen • www.pecto.at • info@pecto.at</div>
</div></body></html>`;

  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: file, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '12mm', right: '12mm' } });
  await browser.close();

  console.log('✅ PDF erstellt:', file);
  return file;
};

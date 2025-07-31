const express = require('express');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Accept JSON bodies
app.use('/invoices', express.static(path.join(__dirname, 'invoices'))); // Serve saved PDFs

// POST endpoint to generate invoice
app.post('/generate-invoice', async (req, res) => {
  try {
    const { customer, items, invoiceNumber, paymentMethod } = req.body;

    if (!customer || !items || !invoiceNumber || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required invoice data.' });
    }

    const logoPath = path.join(__dirname, 'invoices', 'pecto-logo.png');
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');

    const total = items.reduce((sum, item) => sum + item.total, 0).toFixed(2);

    // HTML content
    const html = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; font-size: 14px; color: #2B4455; }
          h1 { color: #FD6506; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          .logo { max-height: 60px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #FD6506; color: white; padding: 10px; }
          td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .total { text-align: right; margin-top: 20px; }
          .footer { margin-top: 60px; font-size: 11px; color: #555; }
        </style>
      </head>
      <body>
        <div class="header">
          <img class="logo" src="data:image/png;base64,${logoBase64}" />
          <div style="text-align: right;">
            <strong>PECTO e.U.</strong><br />
            info@pecto.at<br />
            In der Wiesen 13/1/16<br />
            1230 Wien
          </div>
        </div>

        <h1>Rechnung</h1>
        <div><strong>Kunde:</strong><br />
          ${customer.name}<br />
          ${customer.address}<br />
          ${customer.zip} ${customer.city}
        </div>

        <div style="margin-top: 10px;">
          Rechnungsnummer: ${invoiceNumber}<br />
          Datum: ${new Date().toLocaleDateString('de-DE')}<br />
          Zahlungsart: ${paymentMethod}
        </div>

        <table>
          <tr>
            <th>Produkt</th>
            <th>Anzahl</th>
            <th>Einzelpreis</th>
            <th>Gesamt</th>
          </tr>
          ${items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>€${Number(item.unitPrice).toFixed(2)}</td>
              <td>€${Number(item.total).toFixed(2)}</td>
            </tr>`).join('')}
        </table>

        <div class="total">
          Zwischensumme: €${total}<br />
          MwSt (0%): €0,00<br />
          <strong>Gesamtbetrag: €${total}</strong>
        </div>

        <div class="footer">
          *Gemäß § 6 Abs. 1 Z 27 UStG steuerfrei – Kleinunternehmerregelung<br />
          www.pecto.at • info@pecto.at
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: true
});


    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const invoiceFileName = `invoice-${invoiceNumber}.pdf`;
    const invoicePath = path.join(__dirname, 'invoices', invoiceFileName);
    fs.writeFileSync(invoicePath, pdfBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoiceFileName}`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('❌ Fehler beim Erstellen der Rechnung:', err);
    res.status(500).send('Fehler beim Erstellen der Rechnung.');
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('✅ PECTO Invoice Server läuft');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
});

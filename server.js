const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const generateEmailHTML = require('./emailTemplate');
const generateInvoicePDF = require('./invoiceGenerator');

const app = express();
app.use(express.json());

// --- Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_PORT) === '465', // 465=true, 587/25=false
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- Attachments (logo + pdf)
const attachments = (invoicePath, invoiceNumber) => ([
  {
    filename: 'logo-email.png',
    path: path.join(__dirname, 'assets', 'logo-email.png'),
    cid: 'pectoLogo@cid',            // must match <img src="cid:...">
    contentType: 'image/png',
    contentDisposition: 'inline'
  },
  {
    filename: `Rechnung_${invoiceNumber}.pdf`,
    path: invoicePath
  }
]);

// Simple YYYY-#### (German-ish style)
const generateInvoiceNumber = () => {
  const d = new Date();
  const year = d.getFullYear();
  // You can replace this with your persisted counter if you like
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `${year}-${String(seq).padStart(4,'0')}`;
};

// (optional) quick health route
app.get('/health', (_, res) => res.json({ status: 'healthy' }));

// Generate PDF + send email
app.post('/generate-invoice-and-email', async (req, res) => {
  try {
    const order = req.body;
    const invoiceNumber = generateInvoiceNumber();
    order.invoiceNumber = invoiceNumber;

    // Calculate totals if caller didn’t supply them
    const subtotal = (order.items || []).reduce((s, i) => s + (i.total ?? (i.quantity * i.unitPrice)), 0);
    const shipping = Number(order.shippingCost || 0);
    const discount = Number(order.discountAmount || 0);
    order.totals = {
      subtotal,
      shipping,
      discount,
      grandTotal: subtotal + shipping - discount
    };

    // Generate PDF
    const invoicesDir = path.join(__dirname, 'invoices');
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
    const invoicePath = path.join(invoicesDir, `Rechnung_${invoiceNumber}.pdf`);
    await generateInvoicePDF(order, invoicePath);

    // Ensure logo exists (helps debugging)
    const logoPath = path.join(__dirname, 'assets', 'logo-email.png');
    if (!fs.existsSync(logoPath)) {
      console.warn('⚠️  assets/logo-email.png not found. Logo will not render.');
    }

    // Generate HTML
    const emailHTML = generateEmailHTML(order);

    // Send to customer + copy to accounting
    await transporter.sendMail({
      from: `"PECTO" <${process.env.EMAIL_USER}>`,
      to: order.customer.email,
      bcc: 'rechnung@pecto.at',
      subject: `Bestellbestätigung & Rechnung ${invoiceNumber}`,
      html: emailHTML,
      attachments: attachments(invoicePath, invoiceNumber)
    });

    res.json({ success: true, message: 'Rechnung gesendet', invoiceNumber });
  } catch (err) {
    console.error('Fehler beim Senden der Rechnung:', err);
    res.status(500).json({ success: false, error: 'E-Mail konnte nicht gesendet werden.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));

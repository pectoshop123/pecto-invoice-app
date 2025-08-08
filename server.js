require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const nodemailer = require('nodemailer');

const generateInvoice = require('./generateInvoice');
const getNextInvoiceNumber = require('./invoiceNumberGenerator');
const generateEmailHTML = require('./emailTemplate');

const app = express();
const port = process.env.PORT || 10000;

app.use(bodyParser.json());

// --- SMTP transporter ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.pecto.at',
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || 'true') === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Sanity check
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ Missing EMAIL_USER or EMAIL_PASS in .env');
  process.exit(1);
}

app.get('/', (_req, res) => res.send('✅ PECTO Invoice Server läuft'));

app.get('/health', (_req, res) => res.status(200).json({ status: 'healthy' }));

app.post('/generate-invoice-and-email', async (req, res) => {
  try {
    const orderData = req.body;

    // Validate minimal payload
    if (
      !orderData ||
      !orderData.customer ||
      !orderData.customer.email ||
      !Array.isArray(orderData.items) ||
      orderData.items.length === 0
    ) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    // Auto invoice number if missing
    if (!orderData.invoiceNumber) {
      orderData.invoiceNumber = getNextInvoiceNumber();
    }

    // Derive totals
    const subtotal = orderData.items.reduce((sum, i) => sum + Number(i.total || (i.quantity * i.unitPrice) || 0), 0);
    const shipping = Number(orderData.shippingCost || 0);
    const discount = Number(orderData.discountAmount || 0);
    const grandTotal = (subtotal + shipping - discount);

    // Generate the PDF
    const invoicePath = await generateInvoice({
      ...orderData,
      totals: { subtotal, shipping, discount, grandTotal }
    });
    if (!fs.existsSync(invoicePath)) throw new Error('Generated invoice file not found');

    // Build email HTML
    const emailHtml = generateEmailHTML({
      ...orderData,
      totals: { subtotal, shipping, discount, grandTotal }
    });

    const subject = `Bestellbestätigung & Rechnung #${orderData.invoiceNumber}`;

    // Send both emails (customer + copy)
    const customerEmail = transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: orderData.customer.email,
      subject,
      html: emailHtml,
      attachments: [{ filename: `Rechnung_${orderData.invoiceNumber}.pdf`, path: invoicePath }]
    }).then(() => console.log('✅ Customer email sent'))
      .catch(err => console.error('❌ Customer email failed:', err.message));

    const copyEmail = transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.COPY_TO || 'rechnung@pecto.at',
      subject: `Kopie: Rechnung #${orderData.invoiceNumber}`,
      html: emailHtml,
      attachments: [{ filename: `Rechnung_${orderData.invoiceNumber}.pdf`, path: invoicePath }]
    }).then(() => console.log('✅ Copy email sent'))
      .catch(err => console.error('❌ Copy email failed:', err.message));

    await Promise.allSettled([customerEmail, copyEmail]);

    res.status(200).json({ message: 'Invoice generated and emails sent', invoiceNumber: orderData.invoiceNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate invoice or send emails', details: err.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server läuft auf http://0.0.0.0:${port}`);
});

// Safety logs
process.on('unhandledRejection', (r) => console.error('UnhandledRejection:', r));
process.on('uncaughtException', (e) => console.error('UncaughtException:', e));

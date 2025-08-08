const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const generateEmailHTML = require('./emailTemplate');
const generateInvoicePDF = require('./invoiceGenerator');

const app = express();
app.use(express.json());

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Attachments: logo + PDF invoice
const attachments = (invoicePath, invoiceNumber) => ([
  {
    filename: 'logo-email.png',
    path: path.join(__dirname, 'assets', 'logo-email.png'),
    cid: 'pectoLogo@cid' // same CID used in emailTemplate.js
  },
  {
    filename: `Rechnung_${invoiceNumber}.pdf`,
    path: invoicePath
  }
]);

// Helper: generate automatic invoice number
const getNextInvoiceNumber = () => {
  const counterFile = path.join(__dirname, 'invoiceCounter.txt');
  let counter = 1;

  if (fs.existsSync(counterFile)) {
    counter = parseInt(fs.readFileSync(counterFile, 'utf8'), 10) + 1;
  }

  fs.writeFileSync(counterFile, String(counter), 'utf8');
  return counter.toString().padStart(5, '0'); // e.g. 00001, 00002
};

// Main route
app.post('/generate-invoice-and-email', async (req, res) => {
  try {
    const orderData = req.body;

    // Assign automatic invoice number if missing
    if (!orderData.invoiceNumber) {
      orderData.invoiceNumber = getNextInvoiceNumber();
    }

    // Generate PDF invoice
    const invoicePath = await generateInvoicePDF(orderData);

    // Generate HTML email body
    const emailHTML = generateEmailHTML(orderData);

    // Send to customer
    await transporter.sendMail({
      from: `"PECTO" <${process.env.EMAIL_USER}>`,
      to: orderData.customer.email,
      subject: `Rechnung #${orderData.invoiceNumber} – PECTO`,
      html: emailHTML,
      attachments: attachments(invoicePath, orderData.invoiceNumber)
    });

    // Send copy to your inbox
    await transporter.sendMail({
      from: `"PECTO" <${process.env.EMAIL_USER}>`,
      to: 'rechnung@pecto.at',
      subject: `Rechnung Kopie #${orderData.invoiceNumber}`,
      html: emailHTML,
      attachments: attachments(invoicePath, orderData.invoiceNumber)
    });

    res.json({ success: true, invoiceNumber: orderData.invoiceNumber });
  } catch (err) {
    console.error('❌ Fehler beim Senden der E-Mail:', err);
    res.status(500).json({ error: 'Fehler beim Senden der E-Mail' });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});

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

// Generate invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000) + 1000}`;
};

// API route: generate PDF + send email
app.post('/generate-invoice-and-email', async (req, res) => {
  try {
    const order = req.body;
    const invoiceNumber = generateInvoiceNumber();
    order.invoiceNumber = invoiceNumber;

    // Generate PDF
    const invoicePath = path.join(__dirname, 'invoices', `Rechnung_${invoiceNumber}.pdf`);
    await generateInvoicePDF(order, invoicePath);

    // Generate HTML email
    const emailHTML = generateEmailHTML(order);

    // Send email
    await transporter.sendMail({
      from: `"PECTO" <${process.env.EMAIL_USER}>`,
      to: order.customer.email,
      cc: process.env.EMAIL_USER, // Copy to yourself
      subject: `Ihre Rechnung ${invoiceNumber}`,
      html: emailHTML,
      attachments: attachments(invoicePath, invoiceNumber)
    });

    res.json({ success: true, message: 'Rechnung gesendet', invoiceNumber });
  } catch (error) {
    console.error('Fehler beim Senden der Rechnung:', error);
    res.status(500).json({ success: false, error: 'E-Mail konnte nicht gesendet werden.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));

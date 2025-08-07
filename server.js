require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const generateInvoice = require('./generateInvoice');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 10000;

app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
  host: 'mail.pecto.at',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.get('/', (req, res) => {
  res.send('✅ PECTO Invoice Server läuft');
});

app.post('/generate-invoice-and-email', async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.customer || !orderData.items || !orderData.invoiceNumber || !orderData.customer.email) {
      return res.status(400).json({ error: 'Invalid order data (missing customer email)' });
    }

    const invoicePath = await generateInvoice(orderData);
    const itemCount = orderData.items.length;
    const emailTitle = 'Bestellbestätigung und Rechnung';
    const productList = orderData.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>€${item.unitPrice.toFixed(2)}</td>
        <td>€${item.total.toFixed(2)}</td>
      </tr>
    `).join('');
    const subtotal = orderData.items.reduce((sum, i) => sum + i.total, 0).toFixed(2);
    const shipping = orderData.shippingCost ? orderData.shippingCost.toFixed(2) : '0.00';
    const discount = orderData.discountAmount ? orderData.discountAmount.toFixed(2) : '0.00';
    const grandTotal = (parseFloat(subtotal) + parseFloat(shipping) - parseFloat(discount)).toFixed(2);
    const customerEmailHTML = `<!DOCTYPE html>…${/* [Your HTML Email Template Here] */''}`;

    // Send emails independently
    const customerEmail = transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: orderData.customer.email,
      subject: emailTitle,
      html: customerEmailHTML,
      attachments: [{ filename: `Rechnung_${orderData.invoiceNumber}.pdf`, path: invoicePath }]
    }).then(() => console.log('Customer email sent successfully'))
      .catch(err => console.error('Customer email failed:', err.message));

    const copyEmail = transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'rechnung@pecto.at',
      subject: `Rechnung Kopie #${orderData.invoiceNumber}`,
      text: `Anbei eine Kopie der Rechnung für Bestellung #${orderData.invoiceNumber}.`,
      attachments: [{ filename: `Rechnung_${orderData.invoiceNumber}.pdf`, path: invoicePath }]
    }).then(() => console.log('Copy email sent successfully'))
      .catch(err => console.error('Copy email failed:', err.message));

    // Wait for both emails to attempt (non-blocking)
    await Promise.allSettled([customerEmail, copyEmail]);

    res.status(200).json({ message: 'Invoice generated and emails sent (some may have failed)' });
  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
    res.status(500).json({ error: 'Failed to generate invoice or send emails', details: error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server läuft auf http://0.0.0.0:${port}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

module.exports = app;

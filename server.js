// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const generateInvoice = require('./generateInvoice'); // Import PDF generator
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000; // Changed to 10000 to match your setup

app.use(bodyParser.json());

// SMTP configuration for Pecto email
const transporter = nodemailer.createTransport({
  host: 'mail.pecto.at',
  port: 465,
  secure: true, // SSL/TLS on port 465
  auth: {
    user: process.env.EMAIL_USER, // e.g., rechnung@pecto.at
    pass: process.env.EMAIL_PASS // Password for rechnung@pecto.at
  }
});

// Endpoint to generate invoice and send emails (called after payment)
app.post('/generate-invoice-and-email', async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.customer || !orderData.items || !orderData.invoiceNumber || !orderData.customer.email) {
      return res.status(400).json({ error: 'Invalid order data (missing customer email)' });
    }

    // Generate PDF
    const invoicePath = await generateInvoice(orderData);

    // Prepare email HTML for customer (adapted from Shopify template)
    const itemCount = orderData.items.length;
    const emailTitle = 'Bestellbestätigung und Rechnung';
    const emailBody = `
      Vielen Dank für Ihren Kauf! Hier ist Ihre Bestellbestätigung und Rechnung.
      ${itemCount > 1 ? 'Diese Artikel' : 'Dieser Artikel'} sind für Sie reserviert.
    `;
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

    const customerEmailHTML = `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailTitle}</title>
        <style>
          body {
            font-family: Helvetica, Arial, sans-serif;
            color: #333333;
            background-color: #F8F8F8;
            margin: 0;
            padding: 0;
            line-height: 1.5;
          }
          h2, h3, h4 {
            color: #FD6506;
            font-weight: bold;
            margin-bottom: 10px;
          }
          a {
            color: #FD6506;
            text-decoration: none;
            font-weight: bold;
          }
          a:hover {
            text-decoration: underline;
          }
          .button__cell {
            background: #FD6506;
            text-align: center;
            padding: 12px 20px;
            border-radius: 4px;
            display: inline-block;
          }
          .button__text {
            color: #FFFFFF;
            font-weight: bold;
            text-decoration: none;
          }
          .order-list__item-price, .subtotal-line__value strong, .total-discount--amount {
            color: #333333;
            font-weight: bold;
          }
          .disclaimer__subtext {
            color: #666666;
            font-size: 12px;
          }
          .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          }
          .row {
            width: 100%;
          }
          .section__cell, .footer__cell, .content__cell, .header__cell {
            padding: 30px 20px;
          }
          .subtotal-table, .order-list {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .subtotal-line__title, .subtotal-line__value {
            padding: 12px 0;
            text-align: left;
            border-bottom: 1px solid #EEEEEE;
          }
          .subtotal-line__value {
            text-align: right;
          }
          .customer-info__item {
            padding: 15px 0;
            vertical-align: top;
            margin: 0 10px;
            margin-bottom: 20px;
          }
          .order-list__item {
            border-bottom: 1px solid #EEEEEE;
          }
          .order-list__item:last-child {
            border-bottom: none;
          }
          .order-list__product-image, .order-list__no-product-image {
            margin-right: 10px;
            vertical-align: middle;
            border-radius: 4px;
          }
          .order-list__item-title, .order-list__item-variant, .order-list__item-refunded {
            color: #333333;
          }
          .order-list__item-discount-allocation, .subtotal-line__discount {
            color: #333333;
          }
          .spacer, .empty-line {
            display: block;
            height: 20px;
          }
          .shop-name__cell img {
            max-width: 150px;
            height: auto;
          }
          .subtotal-table--total .subtotal-line__title, .subtotal-table--total .subtotal-line__value {
            color: #333333;
            font-weight: bold;
          }
          .actions__cell {
            text-align: center;
          }
          .logo-container {
            padding: 40px 20px 20px;
            text-align: center;
            background-color: #FFFFFF;
          }
          .section-header {
            border-bottom: 1px solid #EEEEEE;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .address {
            white-space: pre-line;
            margin: 0;
            padding: 10px;
            background-color: #f9f9f9;
            border-radius: 4px;
          }
          .order-number__cell, .po-number__cell {
            text-align: right;
            font-size: 14px;
            color: #666666;
          }
          .order-po-number__container {
            width: 100%;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .order-list__image-cell {
            width: 20%;
          }
          .order-list__product-description-cell {
            width: 60%;
          }
          .order-list__price-cell {
            width: 20%;
            text-align: right;
          }
          .order-list__bundle-item .order-list__image-cell {
            width: 15%;
          }
          .order-list__bundle-item .order-list__product-description-cell {
            width: 85%;
          }
          .discount-tag-icon {
            vertical-align: middle;
            margin-right: 5px;
          }
          .total-discount {
            text-align: right;
            font-size: 14px;
            color: #666666;
          }
          .footer__cell {
            background-color: #F8F8F8;
            padding: 20px;
            text-align: center;
          }
          @media only screen and (max-width: 600px) {
            .container {
              width: 100% !important;
            }
            .header-row {
              display: block;
            }
            .shop-name__cell, .order-po-number__container {
              text-align: center !important;
              margin-bottom: 10px;
            }
            .customer-info__item {
              display: block;
              width: 100% !important;
              margin: 0 0 20px 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <table class="row" style="width: 100%; background-color: #F8F8F8; padding: 40px 0;">
          <tr>
            <td>
              <center>
                <table class="container">
                  <tr>
                    <td class="logo-container">
                      <table class="header-row" style="width: 100%; table-layout: fixed;">
                        <tr>
                          <td class="shop-name__cell" style="text-align: left;">
                            <img src="https://www.pecto.at/wp-content/uploads/2024/01/Pecto-Logo-2-1.png" alt="PECTO e.U." style="max-width: 150px; height: auto;">
                          </td>
                          <td>
                            <table class="order-po-number__container" style="width: 100%;">
                              <tr>
                                <td class="order-number__cell">
                                  <span class="order-number__text">Rechnung #${orderData.invoiceNumber}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td class="content__cell">
                      <h2>${emailTitle}</h2>
                      <p>${emailBody}</p>
                    </td>
                  </tr>
                  <tr>
                    <td class="section__cell">
                      <div class="section-header">
                        <h3>Bestellübersicht</h3>
                      </div>
                      <table class="order-list">
                        <tr>
                          <th>Produkt</th>
                          <th>Anzahl</th>
                          <th>Einzelpreis</th>
                          <th>Gesamt</th>
                        </tr>
                        ${productList}
                      </table>
                      <table class="subtotal-table">
                        <tr class="subtotal-line">
                          <td class="subtotal-line__title">
                            <p><span>Zwischensumme</span></p>
                          </td>
                          <td class="subtotal-line__value">
                            <strong>€${subtotal}</strong>
                          </td>
                        </tr>
                        <tr class="subtotal-line">
                          <td class="subtotal-line__title">
                            <p><span>Versandkosten</span></p>
                          </td>
                          <td class="subtotal-line__value">
                            <strong>€${orderData.shippingCost ? orderData.shippingCost.toFixed(2) : '0.00'}</strong>
                          </td>
                        </tr>
                        ${discount > 0 ? `
                        <tr class="subtotal-line">
                          <td class="subtotal-line__title">
                            <p><span>Rabatt</span></p>
                          </td>
                          <td class="subtotal-line__value">
                            <strong>-€${discount.toFixed(2)}</strong>
                          </td>
                        </tr>
                        ` : ''}
                        <tr class="subtotal-line">
                          <td class="subtotal-line__title">
                            <p><span>MwSt (0%)</span></p>
                          </td>
                          <td class="subtotal-line__value">
                            <strong>€0,00</strong>
                          </td>
                        </tr>
                        <tr class="subtotal-line subtotal-table--total">
                          <td class="subtotal-line__title">
                            <p><span>Gesamt</span></p>
                          </td>
                          <td class="subtotal-line__value">
                            <strong>€${grandTotal}</strong>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td class="footer__cell">
                      <p class="disclaimer__subtext">Falls du Fragen hast, antworte auf diese E-Mail oder kontaktiere uns unter <a href="mailto:info@pecto.at">info@pecto.at</a>.</p>
                    </td>
                  </tr>
                </table>
              </center>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email to customer with HTML and PDF attachment
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: orderData.customer.email,
      subject: emailTitle,
      html: customerEmailHTML,
      attachments: [
        { filename: `Rechnung_${orderData.invoiceNumber}.pdf`, path: invoicePath }
      ]
    });

    // Send copy of PDF to rechnung@pecto.at
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'rechnung@pecto.at',
      subject: `Rechnung Kopie #${orderData.invoiceNumber}`,
      text: `Anbei eine Kopie der Rechnung für Bestellung #${orderData.invoiceNumber}.`,
      attachments: [
        { filename: `Rechnung_${orderData.invoiceNumber}.pdf`, path: invoicePath }
      ]
    });

    res.status(200).json({ message: 'Invoice generated and emails sent' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate invoice or send emails', details: error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Bind to all interfaces to allow external access
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server läuft auf http://0.0.0.0:${port}`);
});

module.exports = app;

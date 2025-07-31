// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const generateInvoice = require('./generateInvoice'); // Import the invoice generator

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Endpoint to generate invoice
app.post('/generate-invoice', async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.customer || !orderData.items || !orderData.invoiceNumber) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    const invoicePath = await generateInvoice(orderData);

    // Send the PDF as a response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderData.invoiceNumber}.pdf"`);
    const pdfStream = fs.createReadStream(invoicePath);
    pdfStream.pipe(res);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;

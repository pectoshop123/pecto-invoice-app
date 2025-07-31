// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { generateInvoice } = require('./generateInvoice'); // Updated import

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

    const pdfBuffer = await generateInvoice(orderData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderData.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
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

// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { generateInvoice } = require('./generateInvoice');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Test Route to confirm app is working
app.get('/', (req, res) => {
  res.send('✅ PECTO Invoice Server is running. POST to /generate-invoice to create PDF.');
});

// Route to generate PDF from order data
app.post('/generate-invoice', async (req, res) => {
  try {
    const order = req.body;

    if (!order || !order.id) {
      return res.status(400).send('Fehlende oder ungültige Bestelldaten.');
    }

    await generateInvoice(order);
    const filePath = path.join(__dirname, 'invoices', `Rechnung-${order.id}.pdf`);

    if (!fs.existsSync(filePath)) {
      return res.status(500).send('PDF konnte nicht erstellt werden.');
    }

    res.status(200).send({ message: 'Rechnung erstellt.', path: filePath });
  } catch (error) {
    console.error('Fehler beim Erstellen der Rechnung:', error);
    res.status(500).send('Interner Serverfehler beim Erstellen der Rechnung.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});

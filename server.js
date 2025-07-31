const express = require('express');
const path = require('path');
const generateInvoice = require('./generateInvoice');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));

app.post('/generate-invoice', async (req, res) => {
  try {
    const { customer, items, invoiceNumber, paymentMethod, shippingCost, discountAmount } = req.body;
    if (!customer || !items || !invoiceNumber || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required invoice data.' });
    }

    const filePath = await generateInvoice({
      customer, items, invoiceNumber, paymentMethod, shippingCost, discountAmount
    });

    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Erstellen der Rechnung.');
  }
});

app.get('/', (req, res) => res.send('✅ PECTO Invoice Server läuft'));

app.listen(PORT, () => console.log(`🚀 Server läuft auf http://localhost:${PORT}`));

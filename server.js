const express = require('express');
const bodyParser = require('body-parser');
const generateInvoice = require('./generateInvoice');

const app = express();
app.use(bodyParser.json({ limit: '5mb' }));

app.post('/generate-invoice', async (req, res) => {
  try {
    // req.body should contain your orderData
    const pdfPath = await generateInvoice(req.body);
    // send file back
    res.type('application/pdf').sendFile(pdfPath);
  } catch (err) {
    console.error('❌ Invoice error:', err);
    res.status(500).send('Fehler beim Erstellen der Rechnung.');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
});

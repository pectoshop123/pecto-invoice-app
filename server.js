const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
    host: 'YOUR_SMTP_SERVER',
    port: 587,
    auth: {
        user: 'YOUR_EMAIL',
        pass: 'YOUR_EMAIL_PASSWORD'
    }
});

function createInvoicePDF(order, pdfPath) {
    return new Promise((resolve) => {
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(pdfPath));

        doc.fontSize(20).fillColor('#2B4455').text('PECTO e.U.', { align: 'left' });
        doc.fontSize(10).fillColor('#000').text('In der Wiesen 13/1/16, 1230 Wien\ninfo@pecto.at\nUID: ATU12345678\nKleinunternehmerregelung § 6 (1) Z 27 UStG');
        doc.moveDown();
        doc.fontSize(12).text(`Rechnung Nr.: ${order.id}`, { align: 'right' });
        doc.text(`Datum: ${order.date}`, { align: 'right' });

        doc.moveDown();
        doc.text(`Rechnung an:\n${order.customerName}\n${order.customerAddress}\n${order.customerZIP} ${order.customerCity}\n${order.customerCountry}`);
        doc.moveDown();

        doc.fillColor('#FD6506').text('Beschreibung                      Menge    Einzelpreis    Gesamt');
        doc.fillColor('#000');
        doc.text(`${order.product}                        ${order.quantity}        EUR ${order.unitPrice}      EUR ${order.total}`);

        doc.moveDown();
        doc.text(`Zwischensumme: EUR ${order.total}`);
        doc.text(`MwSt 0% (Kleinunternehmer): EUR 0.00`);
        doc.text(`Gesamtbetrag: EUR ${order.total}`);

        doc.moveDown();
        doc.text(`Zahlungsart: Shopify / Paypal / etc.`);
        doc.text(`Bezahlt am: ${order.date}`);

        doc.end();
        doc.on('finish', () => resolve());
    });
}

app.post('/payment-confirmation', async (req, res) => {
    const data = req.body;
    const order = {
        id: `S-${data.id}`,
        date: data.created_at.split('T')[0],
        customerName: data.shipping_address.name,
        customerAddress: data.shipping_address.address1,
        customerZIP: data.shipping_address.zip,
        customerCity: data.shipping_address.city,
        customerCountry: data.shipping_address.country,
        product: data.line_items[0].name,
        quantity: data.line_items[0].quantity,
        unitPrice: data.line_items[0].price,
        total: data.total_price,
        customerEmail: data.email
    };

    const pdfPath = path.join(__dirname, 'invoices', `Rechnung-${order.id}.pdf`);
    await createInvoicePDF(order, pdfPath);

    const emailHTML = `
        <h1 style="color:#FD6506;">Deine Rechnung ist fertig.</h1>
        <p>Hallo ${order.customerName},</p>
        <p>vielen Dank für deinen Einkauf bei <strong>PECTO e.U.</strong>.<br>
        Im Anhang findest du deine Rechnung als PDF.</p>
        <p><strong>Rechnungsnummer:</strong> ${order.id}<br>
        <strong>Bestelldatum:</strong> ${order.date}<br>
        <strong>Gesamtbetrag:</strong> EUR ${order.total}</p>
        <p style="font-size:12px;color:#2B4455;">
        PECTO e.U.<br>In der Wiesen 13/1/16, 1230 Wien<br>info@pecto.at • www.pecto.at<br><br>
        Kleinunternehmerregelung gem. § 6 Abs. 1 Z 27 UStG: Keine Umsatzsteuer ausgewiesen.
        </p>
    `;

    const mailOptions = {
        from: 'YOUR_EMAIL',
        to: order.customerEmail,
        bcc: 'YOUR_EMAIL',
        subject: `Ihre Rechnung von PECTO e.U. | Nr. ${order.id}`,
        html: emailHTML,
        attachments: [{
            filename: `Rechnung-${order.id}.pdf`,
            path: pdfPath
        }]
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Email senden fehlgeschlagen.');
        }
        console.log('Email gesendet:', info.response);
        res.status(200).send('Rechnung gesendet.');
    });
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));

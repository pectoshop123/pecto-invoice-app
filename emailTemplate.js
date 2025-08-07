module.exports = function generateEmailHTML(orderData, productList, subtotal, shipping, discount, grandTotal) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Rechnung ${orderData.invoiceNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; color: #2B4455; padding: 20px;">
        <h2 style="color: #FD6506;">Vielen Dank für deine Bestellung, ${orderData.customer.firstName}!</h2>
        <p>Hier findest du die Übersicht deiner Bestellung:</p>
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th>Produkt</th>
              <th>Menge</th>
              <th>Einzelpreis</th>
              <th>Gesamt</th>
            </tr>
          </thead>
          <tbody>
            ${productList}
          </tbody>
        </table>

        <p style="margin-top: 20px;"><strong>Zwischensumme:</strong> €${subtotal}</p>
        <p><strong>Versandkosten:</strong> €${shipping}</p>
        <p><strong>Rabatt:</strong> €${discount}</p>
        <p style="font-size: 1.2em; font-weight: bold; margin-top: 10px;">Gesamtbetrag: €${grandTotal}</p>

        <p style="margin-top: 30px;">Deine Rechnung ist im Anhang als PDF beigefügt.</p>

        <p>Bei Fragen stehen wir gerne zur Verfügung: <a href="mailto:info@pecto.at">info@pecto.at</a></p>

        <p>Viele Grüße,<br><strong>Dein PECTO Team</strong></p>
      </body>
    </html>
  `;
};

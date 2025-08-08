module.exports = function generateEmailHTML(order) {
  const { customer, items, totals, invoiceNumber, paymentMethod } = order;

  const productRows = items.map(i => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee;">${i.name}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">€${Number(i.unitPrice).toFixed(2)}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">€${Number(i.total ?? i.quantity * i.unitPrice).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Rechnung ${invoiceNumber}</title>
  </head>
  <body style="margin:0;padding:0;background:#F8F8F8;font-family:Helvetica,Arial,sans-serif;color:#333;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F8;padding:30px 0;">
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:30px 20px;text-align:center;background:#fff;">
              <img src="https://pecto.at/cdn/logo-email.png" alt="PECTO" style="max-width:150px;height:auto;" />
            </td>
          </tr>

          <tr><td style="padding:0 20px 10px;">
            <h2 style="color:#FD6506;margin:0 0 10px;">Bestellbestätigung & Rechnung</h2>
            <p style="margin:0 0 8px;">Rechnungsnummer: <strong>${invoiceNumber}</strong></p>
            <p style="margin:0 0 8px;">Kunde: <strong>${customer.name}</strong></p>
            <p style="margin:0 0 8px;">Adresse: ${customer.address || ''}, ${customer.zip || ''} ${customer.city || ''}</p>
            <p style="margin:0 0 8px;">Zahlungsart: ${paymentMethod || '—'}</p>
          </td></tr>

          <tr><td style="padding:0 20px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <thead>
                <tr>
                  <th align="left"  style="background:#FD6506;color:#fff;padding:12px 10px;">Produkt</th>
                  <th align="center"style="background:#FD6506;color:#fff;padding:12px 10px;">Anzahl</th>
                  <th align="right" style="background:#FD6506;color:#fff;padding:12px 10px;">Einzelpreis</th>
                  <th align="right" style="background:#FD6506;color:#fff;padding:12px 10px;">Gesamt</th>
                </tr>
              </thead>
              <tbody>${productRows}</tbody>
            </table>
          </td></tr>

          <tr><td style="padding:0 20px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;">Zwischensumme</td>
                <td align="right" style="padding:6px 0;">€${totals.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;">Versand</td>
                <td align="right" style="padding:6px 0;">€${totals.shipping.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;">Rabatt</td>
                <td align="right" style="padding:6px 0;">-€${totals.discount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-top:1px solid #eee;font-weight:bold;">Gesamt</td>
                <td align="right" style="padding:10px 0;border-top:1px solid #eee;font-weight:bold;color:#FD6506;">€${totals.grandTotal.toFixed(2)}</td>
              </tr>
            </table>
          </td></tr>

          <tr>
            <td style="background:#F8F8F8;color:#666;padding:16px 20px;text-align:center;font-size:12px;">
              <p style="margin:6px 0;">Die Rechnung ist als PDF im Anhang beigefügt.</p>
              <p style="margin:6px 0;">Kleinunternehmerregelung gem. § 6 Abs. 1 Z 27 UStG – keine USt. ausgewiesen.</p>
              <p style="margin:6px 0;">Fragen? Antwort einfach auf diese E‑Mail oder schreib uns an <a href="mailto:info@pecto.at" style="color:#FD6506;text-decoration:none;">info@pecto.at</a>.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>
  `;
};

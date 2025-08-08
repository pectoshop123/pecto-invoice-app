const fs = require('fs');
const path = require('path');

const COUNTER_FILE = path.join(__dirname, 'invoiceCounter.json');

function initCounter() {
  const nowYear = new Date().getFullYear();
  return { year: nowYear, counter: 0 };
}

module.exports = function getNextInvoiceNumber() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
  } catch {
    data = initCounter();
  }

  const currentYear = new Date().getFullYear();
  if (data.year !== currentYear) {
    data.year = currentYear;
    data.counter = 0;
  }

  data.counter += 1;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));

  // Format YYYY-0001
  return `${data.year}-${String(data.counter).padStart(4, '0')}`;
};

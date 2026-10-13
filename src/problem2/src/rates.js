export const fallbackRates = [
  { currency: 'USDC', price: 1 },
  { currency: 'ETH', price: 1645.93 },
  { currency: 'WBTC', price: 26002.82 },
  { currency: 'ATOM', price: 7.19 },
  { currency: 'OSMO', price: 0.38 },
  { currency: 'SWTH', price: 0.00404 }
];

export function normalizeRates(records) {
  const newestRates = new Map();

  records.forEach((record) => {
    const existing = newestRates.get(record.currency);
    if (Number.isFinite(record.price) && record.price > 0 && (!existing || record.date > existing.date)) {
      newestRates.set(record.currency, record);
    }
  });

  return [...newestRates.values()].sort((first, second) => first.currency.localeCompare(second.currency));
}

export function calculateOutput(amount, inputPrice, outputPrice) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !inputPrice || !outputPrice) {
    return 0;
  }

  return (numericAmount * inputPrice) / outputPrice;
}

export function sanitizeAmount(value) {
  const [whole = '', ...fraction] = String(value).replace(/[^0-9.]/g, '').split('.');

  return fraction.length ? `${whole}.${fraction.join('')}` : whole;
}

export function formatAmount(value, maximumFractionDigits = 6) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(value);
}

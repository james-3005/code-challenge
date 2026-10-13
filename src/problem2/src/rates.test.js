import { describe, expect, it } from 'vitest';
import { calculateOutput, normalizeRates, sanitizeAmount } from './rates';

describe('normalizeRates', () => {
  it('keeps the latest valid price for each asset', () => {
    const rates = normalizeRates([
      { currency: 'ETH', price: 1600, date: '2023-08-29T07:10:40.000Z' },
      { currency: 'ETH', price: 1650, date: '2023-08-29T07:10:52.000Z' },
      { currency: 'USDC', price: 1, date: '2023-08-29T07:10:40.000Z' },
      { currency: 'VOID', price: 0, date: '2023-08-29T07:10:40.000Z' }
    ]);

    expect(rates).toEqual([
      { currency: 'ETH', price: 1650, date: '2023-08-29T07:10:52.000Z' },
      { currency: 'USDC', price: 1, date: '2023-08-29T07:10:40.000Z' }
    ]);
  });

  it('sorts assets and ignores malformed prices', () => {
    const rates = normalizeRates([
      { currency: 'ZIL', price: Number.NaN, date: '2023-08-29T07:10:40.000Z' },
      { currency: 'ATOM', price: 7.19, date: '2023-08-29T07:10:40.000Z' },
      { currency: 'BUSD', price: -1, date: '2023-08-29T07:10:40.000Z' },
      { currency: 'ETH', price: 1645.93, date: '2023-08-29T07:10:40.000Z' }
    ]);

    expect(rates.map(({ currency }) => currency)).toEqual(['ATOM', 'ETH']);
  });
});

describe('calculateOutput', () => {
  it('converts through USD prices', () => {
    expect(calculateOutput(2, 10, 4)).toBe(5);
  });

  it('returns zero for invalid amounts or prices', () => {
    expect(calculateOutput('invalid', 10, 4)).toBe(0);
    expect(calculateOutput(2, 0, 4)).toBe(0);
  });

  it('supports fractional amounts', () => {
    expect(calculateOutput(1.25, 4, 2)).toBe(2.5);
  });
});

describe('sanitizeAmount', () => {
  it.each([
    ['123.45', '123.45'],
    ['-12e3', '123'],
    ['1.2.3', '1.23'],
    ['abc', ''],
    ['0.0001', '0.0001']
  ])('keeps only one decimal numeric value for %s', (value, expected) => {
    expect(sanitizeAmount(value)).toBe(expected);
  });
});

import { describe, expect, it } from 'vitest';
import { calculateNormalizedReturnSeries } from './normalized-return.js';

describe('calculateNormalizedReturnSeries', () => {
  it('bilinen fiyat serisini dönem başı 100 kabul ederek normalize eder', () => {
    const result = calculateNormalizedReturnSeries([
      { asOfDate: '2025-01-01', price: '100' },
      { asOfDate: '2025-02-01', price: '110' },
      { asOfDate: '2025-03-01', price: '90' },
    ]);

    expect(result.map((p) => p.normalizedReturn?.toString())).toEqual(['100', '110', '90']);
    expect(result.map((p) => p.asOfDate)).toEqual(['2025-01-01', '2025-02-01', '2025-03-01']);
  });

  it('ondalık hassasiyeti korur (float ile kaybolacak bir bölme)', () => {
    // JS float ile 0.3 / 0.1 * 100 === 299.99999999999994 döner. Decimal
    // aritmetiğinde tam olarak 300'dür.
    const result = calculateNormalizedReturnSeries([
      { asOfDate: '2025-01-01', price: '0.1' },
      { asOfDate: '2025-02-01', price: '0.3' },
    ]);

    expect(result[1]?.normalizedReturn?.toString()).toBe('300');
  });

  it('boş diziyi boş dizi olarak döner', () => {
    const result = calculateNormalizedReturnSeries([]);

    expect(result).toEqual([]);
  });

  it('dönem başı fiyatı eksikse (undefined) tüm seri null döner', () => {
    const result = calculateNormalizedReturnSeries([
      { asOfDate: '2025-01-01', price: undefined },
      { asOfDate: '2025-02-01', price: '110' },
    ]);

    expect(result.every((p) => p.normalizedReturn === null)).toBe(true);
  });

  it('dönem başı fiyatı sıfırsa tüm seri null döner (exception fırlatmaz)', () => {
    const result = calculateNormalizedReturnSeries([
      { asOfDate: '2025-01-01', price: '0' },
      { asOfDate: '2025-02-01', price: '110' },
    ]);

    expect(result.every((p) => p.normalizedReturn === null)).toBe(true);
  });

  it('aradaki bir noktanın fiyatı eksikse yalnızca o nokta null olur', () => {
    const result = calculateNormalizedReturnSeries([
      { asOfDate: '2025-01-01', price: '100' },
      { asOfDate: '2025-02-01', price: null },
      { asOfDate: '2025-03-01', price: '120' },
    ]);

    expect(result.map((p) => p.normalizedReturn?.toString() ?? null)).toEqual(['100', null, '120']);
  });
});

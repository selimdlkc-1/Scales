import { describe, expect, it } from 'vitest';
import {
  coingeckoMarketChartResponseSchema,
  toDecimalPriceString,
  toIsoDate,
} from './coingecko-response.js';

describe('coingeckoMarketChartResponseSchema', () => {
  it('geçerli market_chart yanıtını doğrular', () => {
    const result = coingeckoMarketChartResponseSchema.safeParse({
      prices: [
        [1699999999000, 43250.12],
        [1700003599000, 43300.5],
      ],
    });

    expect(result.success).toBe(true);
  });

  it('prices eksikse reddeder', () => {
    const result = coingeckoMarketChartResponseSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('prices boş diziyse reddeder', () => {
    const result = coingeckoMarketChartResponseSchema.safeParse({ prices: [] });

    expect(result.success).toBe(false);
  });

  it('bozuk veri: price elemanı [timestamp, price] çifti değilse reddeder', () => {
    const result = coingeckoMarketChartResponseSchema.safeParse({
      prices: [[1699999999000]],
    });

    expect(result.success).toBe(false);
  });

  it('bozuk veri: price negatifse reddeder', () => {
    const result = coingeckoMarketChartResponseSchema.safeParse({
      prices: [[1699999999000, -1]],
    });

    expect(result.success).toBe(false);
  });

  it('bozuk veri: price beklenmeyen tipte (string) ise reddeder', () => {
    const result = coingeckoMarketChartResponseSchema.safeParse({
      prices: [[1699999999000, '43250.12']],
    });

    expect(result.success).toBe(false);
  });
});

describe('toIsoDate (coingecko)', () => {
  it('unix ms timestamp değerini ISO YYYY-MM-DD forma çevirir', () => {
    expect(toIsoDate(1699999999000)).toBe('2023-11-14');
  });
});

describe('toDecimalPriceString (coingecko)', () => {
  it('number price değerini 6 ondalıklı decimal-string forma çevirir', () => {
    expect(toDecimalPriceString(43250.12)).toBe('43250.120000');
  });
});

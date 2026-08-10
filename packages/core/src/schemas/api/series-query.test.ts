import { describe, expect, it } from 'vitest';
import { seriesQuerySchema } from './series-query.js';

describe('seriesQuerySchema', () => {
  it('geçerli assets + period için doğrular', () => {
    const result = seriesQuerySchema.parse({ assets: 'USDTRY,BTC,XAUTRY', period: '5y' });

    expect(result).toEqual({ assets: 'USDTRY,BTC,XAUTRY', period: '5y' });
  });

  it('assets eksikse reddeder', () => {
    const result = seriesQuerySchema.safeParse({ period: '1m' });

    expect(result.success).toBe(false);
  });

  it('period eksikse reddeder', () => {
    const result = seriesQuerySchema.safeParse({ assets: 'USDTRY' });

    expect(result.success).toBe(false);
  });

  it('geçersiz period değerini reddeder', () => {
    const result = seriesQuerySchema.safeParse({ assets: 'USDTRY', period: 'yearly' });

    expect(result.success).toBe(false);
  });
});

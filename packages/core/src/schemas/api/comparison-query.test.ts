import { describe, expect, it } from 'vitest';
import { comparisonQuerySchema } from './comparison-query.js';

describe('comparisonQuerySchema', () => {
  it('geçerli tam query için doğrular ve alanları olduğu gibi geçirir', () => {
    const result = comparisonQuerySchema.parse({
      assets: 'USDTRY,BTC',
      period: '1y',
      sortBy: 'nominalReturn',
      sortDir: 'asc',
    });

    expect(result).toEqual({
      assets: 'USDTRY,BTC',
      period: '1y',
      sortBy: 'nominalReturn',
      sortDir: 'asc',
    });
  });

  it('sortBy/sortDir belirtilmediğinde varsayılanları uygular', () => {
    const result = comparisonQuerySchema.parse({ period: '3m' });

    expect(result.sortBy).toBe('realReturn');
    expect(result.sortDir).toBe('desc');
    expect(result.assets).toBeUndefined();
  });

  it('geçersiz period değerini reddeder', () => {
    const result = comparisonQuerySchema.safeParse({ period: '10y' });

    expect(result.success).toBe(false);
  });

  it('period eksikse reddeder', () => {
    const result = comparisonQuerySchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

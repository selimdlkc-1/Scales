import { describe, expect, it } from 'vitest';
import { assetsQuerySchema } from './assets-query.js';

describe('assetsQuerySchema', () => {
  it('geçerli assetClass için doğrular', () => {
    const result = assetsQuerySchema.parse({ assetClass: 'crypto' });

    expect(result).toEqual({ assetClass: 'crypto' });
  });

  it('assetClass belirtilmediğinde de doğrular (opsiyonel)', () => {
    const result = assetsQuerySchema.parse({});

    expect(result.assetClass).toBeUndefined();
  });

  it('geçersiz assetClass değerini reddeder', () => {
    const result = assetsQuerySchema.safeParse({ assetClass: 'stock' });

    expect(result.success).toBe(false);
  });
});

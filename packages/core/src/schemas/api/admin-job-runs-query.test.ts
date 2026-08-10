import { describe, expect, it } from 'vitest';
import { adminJobRunsQuerySchema } from './admin-job-runs-query.js';

describe('adminJobRunsQuerySchema', () => {
  it('geçerli dataSource + limit için doğrular', () => {
    const result = adminJobRunsQuerySchema.parse({ dataSource: 'tefas', limit: '25' });

    expect(result).toEqual({ dataSource: 'tefas', limit: 25 });
  });

  it('limit belirtilmediğinde varsayılan 50 uygular', () => {
    const result = adminJobRunsQuerySchema.parse({});

    expect(result.limit).toBe(50);
    expect(result.dataSource).toBeUndefined();
  });

  it('limit 200 üstünü reddeder', () => {
    const result = adminJobRunsQuerySchema.safeParse({ limit: '201' });

    expect(result.success).toBe(false);
  });

  it('limit 1 altını reddeder', () => {
    const result = adminJobRunsQuerySchema.safeParse({ limit: '0' });

    expect(result.success).toBe(false);
  });

  it('geçersiz dataSource değerini reddeder', () => {
    const result = adminJobRunsQuerySchema.safeParse({ dataSource: 'binance' });

    expect(result.success).toBe(false);
  });
});

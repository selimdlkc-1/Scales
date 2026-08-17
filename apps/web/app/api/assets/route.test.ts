// Integration test — gerçek lokal Postgres'e karşı çalışır, route→service→repository
// zincirinin tamamını (mock'suz) egzersiz eder (docs/08_TESTING_STRATEGY.md §1).
// `assets` Faz 1 §1.3 seed'iyle statik doldurulur — bu test kendi veri seti
// yazmaz, mevcut referans veriyi salt okur.
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route.js';

function makeRequest(query?: string, ip?: string): NextRequest {
  const url = query ? `http://localhost/api/assets?${query}` : 'http://localhost/api/assets';
  return new NextRequest(url, { headers: ip ? { 'x-forwarded-for': ip } : undefined });
}

describe('GET /api/assets', () => {
  it('filtresiz istekte 200 döner, tüm aktif varlıkları (68) içerir, cache header doğru', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=3600, stale-while-revalidate=86400',
    );

    const body = (await response.json()) as {
      data: Array<{ symbol: string; nameTr: string; assetClass: string }>;
      meta: { requestId: string; generatedAt: string };
    };

    expect(body.data).toHaveLength(68);
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        symbol: expect.any(String),
        nameTr: expect.any(String),
        assetClass: expect.any(String),
      }),
    );
  });

  it('assetClass=fx filtresiyle yalnızca döviz varlıklarını döner', async () => {
    const response = await GET(makeRequest('assetClass=fx'));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: Array<{ assetClass: string }> };

    expect(body.data).toHaveLength(2);
    expect(body.data.every((row) => row.assetClass === 'fx')).toBe(true);
  });

  it('geçersiz assetClass için 400 VALIDATION_ERROR döner', async () => {
    const response = await GET(makeRequest('assetClass=stock'));

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { code: string; message: string; details: { field: string; received: string } };
    };

    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual({ field: 'assetClass', received: 'stock' });
  });

  // docs/08_TESTING_STRATEGY.md §4 "Rate limit eşiği aşımı" — merkezi
  // `withRateLimit` (docs/03_API_CONTRACTS.md §6, IP başına dk 60 istek)
  // gerçek zaman beklenmeden, aynı IP'den ardışık isteklerle tetiklenir.
  // Sayaç deposu `lib/middleware/with-rate-limit.ts`'te modül-seviyesi
  // paylaşımlıdır — bu dosyadaki diğer testlerle çakışmaması için özel bir
  // `x-forwarded-for` IP'si kullanılır (bkz. dosya başı desen).
  it('IP başına dakikada 60 istek limiti aşılırsa 429 RATE_LIMITED + Retry-After döner', async () => {
    const ip = 'rate-limit-test-assets';

    for (let i = 0; i < 60; i += 1) {
      const response = await GET(makeRequest(undefined, ip));
      expect(response.status).toBe(200);
    }

    const limited = await GET(makeRequest(undefined, ip));

    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);

    const body = (await limited.json()) as { error: { code: string }; meta: { requestId: string } };
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.meta.requestId).toEqual(expect.any(String));
  });
});

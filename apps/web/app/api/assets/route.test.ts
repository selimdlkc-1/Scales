// Integration test — gerçek lokal Postgres'e karşı çalışır, route→service→repository
// zincirinin tamamını (mock'suz) egzersiz eder (docs/08_TESTING_STRATEGY.md §1).
// `assets` Faz 1 §1.3 seed'iyle statik doldurulur — bu test kendi veri seti
// yazmaz, mevcut referans veriyi salt okur.
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route.js';

function makeRequest(query?: string): NextRequest {
  const url = query ? `http://localhost/api/assets?${query}` : 'http://localhost/api/assets';
  return new NextRequest(url);
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
});

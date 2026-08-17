// Integration test — gerçek lokal Postgres'e karşı çalışır, route→service→repository
// zincirinin tamamını (mock'suz) egzersiz eder (docs/08_TESTING_STRATEGY.md §1).
// `asset_classes` Faz 1 §1.3 seed'iyle statik doldurulur — bu test kendi veri
// seti yazmaz, mevcut referans veriyi salt okur.
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route.js';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/asset-classes');
}

describe('GET /api/asset-classes', () => {
  it('200 döner, 4 satırı sort_order sıralı içerir, envelope + cache header doğru', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');

    const body = (await response.json()) as {
      data: Array<{ code: string; nameTr: string; sortOrder: number }>;
      meta: { requestId: string; generatedAt: string };
    };

    expect(body.data).toEqual([
      { code: 'fx', nameTr: 'Döviz', sortOrder: 1 },
      { code: 'gold', nameTr: 'Altın', sortOrder: 2 },
      { code: 'crypto', nameTr: 'Kripto Para', sortOrder: 3 },
      { code: 'fund', nameTr: 'Yatırım Fonu', sortOrder: 4 },
    ]);
    expect(body.meta.requestId).toMatch(/^[a-f0-9]{8}$/);
    expect(() => new Date(body.meta.generatedAt).toISOString()).not.toThrow();
  });
});

// Integration test — gerçek lokal Postgres'e karşı çalışır (docker compose up -d
// önkoşuldur, docs/08_TESTING_STRATEGY.md §5). Bu dosya herhangi bir fixture satırı
// yazmaz/silmez (`asset-classes`/`assets` gibi salt-okunur bağlantı kontrolü), bu
// yüzden diğer test dosyalarıyla paralel çalışırken çakışma riski yoktur.
import { prisma } from '@terazi/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route.js';

describe('GET /api/health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('DB bağlantısı ayaktayken 200 {status:"ok",database:"ok"} döner', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', database: 'ok' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it("yanıt {data,meta} envelope'una sarmaz — düz JSON döner (docs/03 §5.4 istisnası)", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).not.toHaveProperty('data');
    expect(body).not.toHaveProperty('meta');
  });

  it('DB bağlantısı kesikken 503 {status:"degraded",database:"error"} döner', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('connection refused'));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'degraded', database: 'error' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

// Integration test — gerçek lokal Postgres'e karşı çalışır (docker compose up -d +
// prisma migrate deploy önkoşuldur, docs/08_TESTING_STRATEGY.md §5).
//
// `isStale` iş kuralının kendisi (eski/yeni `started_at` fixture'larıyla,
// sabit `now`) `lib/services/admin-service.test.ts`'te mock'lu repository ile
// izole doğrulanır. Bu route hiçbir satır yazmaz (salt okunur) ve paralel
// worker job testleriyle (tcmb/tefas/coingecko-job.test.ts) aynı `job_runs`
// tablosunu okur — gerçek zamana göre değişen `isStale` değerini burada
// sabitlemeye çalışmak flaky olurdu; bu dosya yalnızca route kablolamasını
// (auth, response şekli, cache header) doğrular.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route.js';

const TEST_USERNAME = 'test-operator';
const TEST_PASSWORD = 'test-password';

function basicAuthHeader(): string {
  return `Basic ${Buffer.from(`${TEST_USERNAME}:${TEST_PASSWORD}`).toString('base64')}`;
}

function makeRequest(authorization?: string): NextRequest {
  return new NextRequest('http://localhost/api/admin/sources', {
    headers: authorization ? { authorization } : undefined,
  });
}

describe('GET /api/admin/sources', () => {
  beforeEach(() => {
    vi.stubEnv('OPERATOR_USERNAME', TEST_USERNAME);
    vi.stubEnv('OPERATOR_PASSWORD', TEST_PASSWORD);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Authorization header eksikse 401 UNAUTHORIZED + WWW-Authenticate döner', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="Terazi Operator Panel"');

    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('yanlış credential ile 401 döner', async () => {
    const wrongHeader = `Basic ${Buffer.from('yanlis:sifre').toString('base64')}`;
    const response = await GET(makeRequest(wrongHeader));

    expect(response.status).toBe(401);
  });

  it('doğru credential ile 200 döner, no-store cache header taşır, 3 kaynağın tümünü içerir', async () => {
    const response = await GET(makeRequest(basicAuthHeader()));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const body = (await response.json()) as {
      data: Array<{
        dataSource: string;
        lastSuccessAt: string | null;
        lastRunStatus: string | null;
        isStale: boolean;
      }>;
      meta: { requestId: string };
    };

    expect(body.data.map((row) => row.dataSource).sort()).toEqual(['coingecko', 'tcmb', 'tefas']);
    for (const row of body.data) {
      expect(typeof row.isStale).toBe('boolean');
    }
    expect(body.meta.requestId).toEqual(expect.any(String));
  });
});

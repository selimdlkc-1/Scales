// Integration test — gerçek lokal Postgres'e karşı çalışır (docker compose up -d +
// prisma migrate deploy önkoşuldur, docs/08_TESTING_STRATEGY.md §5).
//
// CI'da apps/web/apps/worker/packages/core testleri aynı paylaşımlı Postgres'e
// karşı PARALEL çalışır (turbo/pnpm -w). `tcmb/tefas/coingecko-job.test.ts`
// kendi `beforeEach`'inde dataSource bazlı TÜM `job_runs` satırlarını siliyor
// (bkz. apps/worker/src/jobs/tefas-job.test.ts) — bu yüzden bu dosya asla
// wholesale delete yapmaz, yalnızca kendi oluşturduğu satırları `id`'ye göre
// ekler/temizler; ayrıca gerçek worker job'larının (`new Date()` ile yazdığı)
// `started_at` değerleriyle asla çakışmayacak uzak bir gelecek tarih (2099)
// kullanılır ki "en yeni" sıralı sorgularda bu satırlar her zaman üstte kalsın.
import { prisma } from '@terazi/core';
import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route.js';

const TEST_USERNAME = 'test-operator';
const TEST_PASSWORD = 'test-password';

function basicAuthHeader(): string {
  return `Basic ${Buffer.from(`${TEST_USERNAME}:${TEST_PASSWORD}`).toString('base64')}`;
}

function makeRequest(query?: string, authorization?: string): NextRequest {
  const url = query
    ? `http://localhost/api/admin/job-runs?${query}`
    : 'http://localhost/api/admin/job-runs';
  return new NextRequest(url, { headers: authorization ? { authorization } : undefined });
}

const FIXTURE_STARTED_AT = new Date('2099-01-01T18:30:00Z');
const FIXTURE_FINISHED_AT = new Date('2099-01-01T18:31:00Z');

describe('GET /api/admin/job-runs', () => {
  const insertedIds: bigint[] = [];

  beforeAll(async () => {
    const tefasSuccess = await prisma.jobRun.create({
      data: {
        dataSource: 'tefas',
        status: 'success',
        startedAt: FIXTURE_STARTED_AT,
        finishedAt: FIXTURE_FINISHED_AT,
        recordsUpserted: 58,
        errorMessage: null,
      },
    });
    insertedIds.push(tefasSuccess.id);
  });

  afterAll(async () => {
    await prisma.jobRun.deleteMany({ where: { id: { in: insertedIds } } });
  });

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
    const response = await GET(makeRequest(undefined, wrongHeader));

    expect(response.status).toBe(401);
  });

  it('doğru credential ile 200 döner, no-store cache header taşır, fixture satırını içerir', async () => {
    const response = await GET(makeRequest('dataSource=tefas&limit=5', basicAuthHeader()));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const body = (await response.json()) as {
      data: Array<{
        id: number;
        dataSource: string;
        status: string;
        recordsUpserted: number;
        errorMessage: string | null;
      }>;
      meta: { requestId: string };
    };

    expect(body.data.every((row) => row.dataSource === 'tefas')).toBe(true);
    expect(
      body.data.some(
        (row) =>
          row.status === 'success' && row.recordsUpserted === 58 && row.errorMessage === null,
      ),
    ).toBe(true);
    expect(body.meta.requestId).toEqual(expect.any(String));
  });

  // `withValidation` `withAdminAuth`'tan DAHA DIŞTA çalışır (docs/04_BACKEND_SPEC.md
  // §4 madde 4 sırası) — bu yüzden geçersiz query, Authorization header'ı hiç
  // olmasa dahi 401 değil 400 ile kısa devre yapar.
  it('geçersiz dataSource için, Authorization olmasa dahi 400 VALIDATION_ERROR döner', async () => {
    const response = await GET(makeRequest('dataSource=binance'));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; details: { field: string } } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.field).toBe('dataSource');
  });

  it('limit sınırının üstü (201) 400 döner', async () => {
    const response = await GET(makeRequest('limit=201'));

    expect(response.status).toBe(400);
  });
});

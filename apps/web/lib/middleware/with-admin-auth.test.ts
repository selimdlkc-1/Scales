import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAdminBruteForceStore, withAdminAuth } from './with-admin-auth.js';

const TEST_USERNAME = 'test-operator';
const TEST_PASSWORD = 'test-password';

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function makeRequest(authorization?: string, ip = '9.9.9.9'): NextRequest {
  const headers: Record<string, string> = { 'x-forwarded-for': ip };
  if (authorization) headers.authorization = authorization;

  return new NextRequest('http://localhost/api/admin/job-runs', { headers });
}

// `OPERATOR_USERNAME`/`OPERATOR_PASSWORD` CI'da tanımlı değildir (yalnızca
// `DATABASE_URL` set edilir, bkz. .github/workflows/ci.yml) — bu test kendi
// deterministik credential'ını `vi.stubEnv` ile enjekte eder, gerçek/lokal
// `.env` değerlerine bağımlı değildir.
describe('withAdminAuth', () => {
  beforeEach(() => {
    vi.stubEnv('OPERATOR_USERNAME', TEST_USERNAME);
    vi.stubEnv('OPERATOR_PASSWORD', TEST_PASSWORD);
    // Sayaç deposu modül-seviyesi paylaşımlıdır (docs/03 §6) — testler arası
    // sızıntıyı önlemek için sıfırlanır (`with-rate-limit.test.ts` ile aynı desen).
    resetAdminBruteForceStore();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('doğru Basic Auth credential ile handler çağrılır, yanıtı olduğu gibi geçirir', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);

    const response = await wrapped(makeRequest(basicAuthHeader(TEST_USERNAME, TEST_PASSWORD)));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: 'ok' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('query parametresini (ikinci argüman) handler’a aynen iletir', async () => {
    const handler = vi.fn(async (_request: NextRequest, query: { limit: number }) =>
      NextResponse.json({ data: query }),
    );
    const wrapped = withAdminAuth(handler);

    await wrapped(makeRequest(basicAuthHeader(TEST_USERNAME, TEST_PASSWORD)), { limit: 50 });

    expect(handler).toHaveBeenCalledWith(expect.any(NextRequest), { limit: 50 });
  });

  it('Authorization header eksikse 401 UNAUTHORIZED + WWW-Authenticate döner, handler çağrılmaz', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);

    const response = await wrapped(makeRequest());

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="Terazi Operator Panel"');
    expect(handler).not.toHaveBeenCalled();

    const body = (await response.json()) as {
      error: { code: string; message: string };
      meta: { requestId: string };
    };
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.meta.requestId).toEqual(expect.any(String));
  });

  it('yanlış şifreyle 401 döner, handler çağrılmaz', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);

    const response = await wrapped(makeRequest(basicAuthHeader(TEST_USERNAME, 'yanlis-sifre')));

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('Basic dışında bir şema (örn. Bearer) 401 döner', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);

    const response = await wrapped(makeRequest('Bearer sometoken'));

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('base64 olarak çözülemeyen/bozuk header 401 döner (exception fırlatmaz)', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);

    const response = await wrapped(makeRequest('Basic :::not-valid-base64:::'));

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('OPERATOR_USERNAME/PASSWORD ortamda tanımsızken hiçbir credential eşleşmez (deny-by-default)', async () => {
    vi.unstubAllEnvs();
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);

    const response = await wrapped(makeRequest(basicAuthHeader('admin', 'admin')));

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});

// İterasyon 3 (§5.3, docs/07_SECURITY_IMPLEMENTATION.md §8,
// docs/03_API_CONTRACTS.md §6) — genel istek limitinden (`with-rate-limit.ts`)
// BAĞIMSIZ brute-force sayacı: yalnızca başarısız Basic Auth denemeleri sayılır,
// aşımda doğru credential'la bile 429 döner.
describe('withAdminAuth — brute-force koruması', () => {
  beforeEach(() => {
    vi.stubEnv('OPERATOR_USERNAME', TEST_USERNAME);
    vi.stubEnv('OPERATOR_PASSWORD', TEST_PASSWORD);
    resetAdminBruteForceStore();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('10 başarısız denemeye kadar her istek kendi 401 sonucunu alır, handler hiç çağrılmaz', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);
    const ip = '7.7.7.7';

    for (let i = 0; i < 10; i += 1) {
      const response = await wrapped(
        makeRequest(basicAuthHeader(TEST_USERNAME, 'yanlis-sifre'), ip),
      );
      expect(response.status).toBe(401);
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it('11. başarısız denemeden sonra DOĞRU credential ile bile 429 RATE_LIMITED döner (docs/07 §8)', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);
    const ip = '8.8.8.8';

    for (let i = 0; i < 10; i += 1) {
      await wrapped(makeRequest(basicAuthHeader(TEST_USERNAME, 'yanlis-sifre'), ip));
    }

    const eleventh = await wrapped(makeRequest(basicAuthHeader(TEST_USERNAME, TEST_PASSWORD), ip));

    expect(eleventh.status).toBe(429);
    expect(eleventh.headers.get('Retry-After')).toEqual(expect.any(String));
    expect(Number(eleventh.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(handler).not.toHaveBeenCalled();

    const body = (await eleventh.json()) as {
      error: { code: string };
      meta: { requestId: string };
    };
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.meta.requestId).toEqual(expect.any(String));
  });

  it("farklı IP'ler bağımsız brute-force sayacı tutar", async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);

    for (let i = 0; i < 10; i += 1) {
      await wrapped(makeRequest(basicAuthHeader(TEST_USERNAME, 'yanlis-sifre'), '1.2.3.4'));
    }

    const otherIpResponse = await wrapped(
      makeRequest(basicAuthHeader(TEST_USERNAME, TEST_PASSWORD), '5.6.7.8'),
    );

    expect(otherIpResponse.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('başarılı denemeler brute-force sayacını artırmaz (yalnızca başarısızlar sayılır)', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);
    const ip = '10.10.10.10';

    for (let i = 0; i < 15; i += 1) {
      const response = await wrapped(
        makeRequest(basicAuthHeader(TEST_USERNAME, TEST_PASSWORD), ip),
      );
      expect(response.status).toBe(200);
    }

    expect(handler).toHaveBeenCalledTimes(15);
  });

  it('pencere süresi (60s) dolunca brute-force sayacı sıfırlanır (gerçek zaman beklenmez, mock kullanılır)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withAdminAuth(handler);
    const ip = '11.11.11.11';

    for (let i = 0; i < 10; i += 1) {
      await wrapped(makeRequest(basicAuthHeader(TEST_USERNAME, 'yanlis-sifre'), ip));
    }
    const blocked = await wrapped(makeRequest(basicAuthHeader(TEST_USERNAME, TEST_PASSWORD), ip));
    expect(blocked.status).toBe(429);

    vi.setSystemTime(new Date('2026-01-01T00:01:01Z')); // pencere (60s) geçti

    const afterWindow = await wrapped(
      makeRequest(basicAuthHeader(TEST_USERNAME, TEST_PASSWORD), ip),
    );
    expect(afterWindow.status).toBe(200);
  });
});

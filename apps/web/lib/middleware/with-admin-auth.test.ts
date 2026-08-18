import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withAdminAuth } from './with-admin-auth.js';

const TEST_USERNAME = 'test-operator';
const TEST_PASSWORD = 'test-password';

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function makeRequest(authorization?: string): NextRequest {
  return new NextRequest('http://localhost/api/admin/job-runs', {
    headers: authorization ? { authorization } : undefined,
  });
}

// `OPERATOR_USERNAME`/`OPERATOR_PASSWORD` CI'da tanımlı değildir (yalnızca
// `DATABASE_URL` set edilir, bkz. .github/workflows/ci.yml) — bu test kendi
// deterministik credential'ını `vi.stubEnv` ile enjekte eder, gerçek/lokal
// `.env` değerlerine bağımlı değildir.
describe('withAdminAuth', () => {
  beforeEach(() => {
    vi.stubEnv('OPERATOR_USERNAME', TEST_USERNAME);
    vi.stubEnv('OPERATOR_PASSWORD', TEST_PASSWORD);
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

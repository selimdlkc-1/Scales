import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetRateLimitStore, withRateLimit } from './with-rate-limit.js';

function makeRequest(ip?: string): NextRequest {
  return new NextRequest('http://localhost/api/assets', {
    headers: ip ? { 'x-forwarded-for': ip } : undefined,
  });
}

// Sayaç deposu modül-seviyesi paylaşımlıdır (docs/03 §6) — testler arası
// sızıntıyı önlemek için `resetRateLimitStore()` ile sıfırlanır (gerçek zaman
// beklemek yerine sayaç sıfırlama, bkz. iterasyon dosyası "Risk/dikkat").
describe('withRateLimit', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('limit aşılmadığı sürece handler her istekte çağrılır', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withRateLimit(handler, { limit: 2 });

    const first = await wrapped(makeRequest('1.1.1.1'));
    const second = await wrapped(makeRequest('1.1.1.1'));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('limit aşılırsa 429 RATE_LIMITED + Retry-After döner, handler çağrılmaz', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withRateLimit(handler, { limit: 2, windowMs: 60_000 });

    await wrapped(makeRequest('2.2.2.2'));
    await wrapped(makeRequest('2.2.2.2'));
    const third = await wrapped(makeRequest('2.2.2.2'));

    expect(third.status).toBe(429);
    expect(third.headers.get('Retry-After')).toEqual(expect.any(String));
    expect(Number(third.headers.get('Retry-After'))).toBeGreaterThan(0);

    const body = (await third.json()) as { error: { code: string }; meta: { requestId: string } };
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.meta.requestId).toEqual(expect.any(String));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("farklı IP'ler bağımsız sayaç tutar", async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withRateLimit(handler, { limit: 1 });

    const responseA = await wrapped(makeRequest('3.3.3.3'));
    const responseB = await wrapped(makeRequest('4.4.4.4'));

    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
  });

  it('x-forwarded-for eksikse ortak bir varsayılan anahtar kullanılır (aynı istemci kabul edilir)', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withRateLimit(handler, { limit: 1 });

    const first = await wrapped(makeRequest());
    const second = await wrapped(makeRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });

  it('pencere süresi dolunca sayaç sıfırlanır (gerçek zaman beklenmez, mock kullanılır)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: 'ok' }));
    const wrapped = withRateLimit(handler, { limit: 1, windowMs: 60_000 });

    const first = await wrapped(makeRequest('5.5.5.5'));
    const blocked = await wrapped(makeRequest('5.5.5.5'));

    vi.setSystemTime(new Date('2026-01-01T00:01:01Z')); // pencere (60s) geçti

    const afterWindow = await wrapped(makeRequest('5.5.5.5'));

    expect(first.status).toBe(200);
    expect(blocked.status).toBe(429);
    expect(afterWindow.status).toBe(200);
  });
});

import { NextRequest, type NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { middleware } from './middleware.js';

const TEST_USERNAME = 'test-operator';
const TEST_PASSWORD = 'test-password';

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function makeRequest(pathname: string, authorization?: string): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: authorization ? { authorization } : undefined,
  });
}

function cspOf(response: NextResponse): string {
  return response.headers.get('Content-Security-Policy') ?? '';
}

// İterasyon 3 (§5.3, docs/07_SECURITY_IMPLEMENTATION.md §7) — CSP artık
// `next.config.ts`'te DEĞİL burada (nonce gerektirdiği için) üretilir; PR #26'daki
// E2E regresyonunu (script-src 'self' Next.js'in inline RSC hydration
// script'lerini bloke ediyordu) düzeltir.
describe('middleware — Content-Security-Policy (nonce tabanlı)', () => {
  beforeEach(() => {
    vi.stubEnv('OPERATOR_USERNAME', TEST_USERNAME);
    vi.stubEnv('OPERATOR_PASSWORD', TEST_PASSWORD);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("admin olmayan route için CSP header'ı nonce'lı script-src ile üretilir", () => {
    const response = middleware(makeRequest('/'));
    const csp = cspOf(response);

    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+'/);
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).toContain("connect-src 'self'");
  });

  it("script-src'de asla 'unsafe-inline' kullanılmaz (yalnızca style-src'de bilinçli istisna var)", () => {
    const csp = cspOf(middleware(makeRequest('/')));
    const scriptSrcDirective = csp.split(';').find((d) => d.trim().startsWith('script-src'));
    const styleSrcDirective = csp.split(';').find((d) => d.trim().startsWith('style-src'));

    expect(scriptSrcDirective).not.toContain('unsafe-inline');
    expect(styleSrcDirective).toContain("'unsafe-inline'");
  });

  it("script-src 'strict-dynamic' içerir (next/dynamic lazy-load chunk'ları nonce'suz enjekte edilir)", () => {
    const csp = cspOf(middleware(makeRequest('/')));
    const scriptSrcDirective = csp.split(';').find((d) => d.trim().startsWith('script-src'));

    expect(scriptSrcDirective).toContain("'strict-dynamic'");
  });

  it("production'da script-src 'unsafe-eval' İÇERMEZ", () => {
    vi.stubEnv('NODE_ENV', 'production');
    const csp = cspOf(middleware(makeRequest('/')));
    const scriptSrcDirective = csp.split(';').find((d) => d.trim().startsWith('script-src'));

    expect(scriptSrcDirective).not.toContain('unsafe-eval');
  });

  it("development'ta script-src 'unsafe-eval' içerir (next dev'in eval tabanlı Fast Refresh'i için, yalnızca dev)", () => {
    vi.stubEnv('NODE_ENV', 'development');
    const csp = cspOf(middleware(makeRequest('/')));
    const scriptSrcDirective = csp.split(';').find((d) => d.trim().startsWith('script-src'));

    expect(scriptSrcDirective).toContain("'unsafe-eval'");
  });

  it('her istekte farklı, tahmin edilemez bir nonce üretir', () => {
    const first = cspOf(middleware(makeRequest('/')));
    const second = cspOf(middleware(makeRequest('/')));
    const nonceOf = (csp: string): string | undefined => csp.match(/nonce-([^']+)'/)?.[1];

    expect(nonceOf(first)).toEqual(expect.any(String));
    expect(nonceOf(first)).not.toBe(nonceOf(second));
  });

  it("x-nonce istek header'ı downstream Server Component'lerin okuyabilmesi için ayarlanır", () => {
    const response = middleware(makeRequest('/'));
    // NextResponse.next({ request }) rewrite edilen isteğin header'ını
    // `x-middleware-request-x-nonce` olarak taşır (Next.js iç sözleşmesi).
    expect(response.headers.get('x-middleware-request-x-nonce')).toEqual(expect.any(String));
  });

  it("/admin dahil TÜM route'larda CSP üretilir (yalnızca statik varlıklar hariç, matcher)", () => {
    const adminResponse = middleware(
      makeRequest('/admin', basicAuthHeader(TEST_USERNAME, TEST_PASSWORD)),
    );
    expect(cspOf(adminResponse)).toMatch(/script-src 'self' 'nonce-[^']+'/);
  });

  it("/admin auth'suz 401 yanıtında bile CSP header'ı taşınır", () => {
    const response = middleware(makeRequest('/admin'));
    expect(response.status).toBe(401);
    expect(cspOf(response)).toMatch(/script-src 'self' 'nonce-[^']+'/);
  });
});

// Mevcut davranış (İterasyon 2) — matcher tüm route'ları kapsayacak şekilde
// genişledi (CSP gereksinimi) ama `/admin` sayfa koruması yalnızca
// `/admin` path'i için elle daraltılarak korunur.
describe('middleware — /admin sayfa koruması (defense in depth, docs/07 §4)', () => {
  beforeEach(() => {
    vi.stubEnv('OPERATOR_USERNAME', TEST_USERNAME);
    vi.stubEnv('OPERATOR_PASSWORD', TEST_PASSWORD);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("doğru Basic Auth credential ile /admin'e erişim 200/next() ile devam eder", () => {
    const response = middleware(
      makeRequest('/admin', basicAuthHeader(TEST_USERNAME, TEST_PASSWORD)),
    );
    expect(response.status).toBe(200);
  });

  it('Authorization header eksikse /admin için 401 + WWW-Authenticate döner', () => {
    const response = middleware(makeRequest('/admin'));

    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="Terazi Operator Panel"');
  });

  it('yanlış şifreyle /admin için 401 döner', () => {
    const response = middleware(
      makeRequest('/admin', basicAuthHeader(TEST_USERNAME, 'yanlis-sifre')),
    );
    expect(response.status).toBe(401);
  });

  it("/admin/job-runs gibi alt path'ler de korunur", () => {
    const response = middleware(makeRequest('/admin/job-runs'));
    expect(response.status).toBe(401);
  });

  it("/api/admin/* bu middleware'in auth kontrolü dışındadır (kendi withAdminAuth katmanı korur)", () => {
    // Basic Auth header'ı OLMASA BİLE bu middleware /api/admin/* için 401 üretmez —
    // o katman `lib/middleware/with-admin-auth.ts`'in sorumluluğudur.
    const response = middleware(makeRequest('/api/admin/job-runs'));
    expect(response.status).toBe(200);
  });

  it("/ gibi admin olmayan route'larda auth kontrolü hiç uygulanmaz", () => {
    const response = middleware(makeRequest('/'));
    expect(response.status).toBe(200);
  });

  it("OPERATOR_USERNAME/PASSWORD ortamda tanımsızken /admin'e hiçbir credential eşleşmez (deny-by-default)", () => {
    vi.unstubAllEnvs();
    const response = middleware(makeRequest('/admin', basicAuthHeader('admin', 'admin')));
    expect(response.status).toBe(401);
  });
});

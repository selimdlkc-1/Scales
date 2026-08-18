import { afterEach, describe, expect, it, vi } from 'vitest';

import nextConfig, { buildSecurityHeaders } from './next.config.js';

// docs/07_SECURITY_IMPLEMENTATION.md §7 — statik güvenlik başlıkları
// (X-Content-Type-Options/X-Frame-Options/Referrer-Policy/HSTS/CORS)
// next.config.ts `headers()` üzerinden merkezi uygulanır
// (.claude/rules/03-security-baseline.md zorunlu kontrol #6). `Content-Security-Policy`
// BURADA test edilmez — Next.js App Router'ın inline RSC hydration script'leri
// yüzünden nonce tabanlı olarak `middleware.ts`'te üretilir (bkz. o dosyanın
// testi, `middleware.test.ts`) — next.config.ts'te CSP hiç yok (PR #26 E2E
// regresyon düzeltmesi).
describe('next.config headers()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("tüm route'lar için (source: /:path*) tek bir başlık grubu tanımlar", async () => {
    const headerGroups = await nextConfig.headers?.();

    expect(headerGroups).toHaveLength(1);
    expect(headerGroups?.[0]?.source).toBe('/:path*');
  });

  it('X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS mevcut; CSP burada yok', () => {
    vi.stubEnv('APP_ORIGIN', '');
    const headers = buildSecurityHeaders();
    const value = (key: string): string | undefined => headers.find((h) => h.key === key)?.value;

    expect(value('X-Content-Type-Options')).toBe('nosniff');
    expect(value('X-Frame-Options')).toBe('DENY');
    expect(value('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(value('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
    expect(value('Content-Security-Policy')).toBeUndefined();
  });

  it('APP_ORIGIN tanımlıysa Access-Control-Allow-Origin o değere sabitlenir, wildcard olmaz', () => {
    vi.stubEnv('APP_ORIGIN', 'https://terazi.vercel.app');

    const headers = buildSecurityHeaders();
    const acao = headers.find((h) => h.key === 'Access-Control-Allow-Origin');

    expect(acao?.value).toBe('https://terazi.vercel.app');
    expect(acao?.value).not.toBe('*');
  });

  it('APP_ORIGIN tanımsızken Access-Control-Allow-Origin header hiç eklenmez', () => {
    vi.stubEnv('APP_ORIGIN', '');

    const headers = buildSecurityHeaders();

    expect(headers.find((h) => h.key === 'Access-Control-Allow-Origin')).toBeUndefined();
  });
});

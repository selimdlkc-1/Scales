import { afterEach, describe, expect, it, vi } from 'vitest';

import nextConfig, { buildSecurityHeaders } from './next.config.js';

// docs/07_SECURITY_IMPLEMENTATION.md §7 — CSP/X-Frame-Options/HSTS vb. tüm
// route'lara next.config.ts `headers()` üzerinden merkezi uygulanır
// (.claude/rules/03-security-baseline.md zorunlu kontrol #6). Bu test hem
// `headers()`'ın Next.js'e döndürdüğü kaydı hem de üreten saf fonksiyonu
// (`buildSecurityHeaders`) doğrular.
describe('next.config headers()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("tüm route'lar için (source: /:path*) tek bir başlık grubu tanımlar", async () => {
    const headerGroups = await nextConfig.headers?.();

    expect(headerGroups).toHaveLength(1);
    expect(headerGroups?.[0]?.source).toBe('/:path*');
  });

  it('CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS mevcut', () => {
    vi.stubEnv('APP_ORIGIN', '');
    const headers = buildSecurityHeaders();
    const value = (key: string): string | undefined => headers.find((h) => h.key === key)?.value;

    expect(value('Content-Security-Policy')).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
    );
    expect(value('X-Content-Type-Options')).toBe('nosniff');
    expect(value('X-Frame-Options')).toBe('DENY');
    expect(value('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(value('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
  });

  it("CSP script-src'de 'unsafe-inline' kullanmaz (yalnızca style-src'de bilinçli istisna var)", () => {
    const headers = buildSecurityHeaders();
    const csp = headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
    const scriptSrcDirective = csp.split(';').find((d) => d.trim().startsWith('script-src'));

    expect(scriptSrcDirective).not.toContain('unsafe-inline');
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

import type { NextConfig } from 'next';

/**
 * HTTP güvenlik başlıkları (docs/07_SECURITY_IMPLEMENTATION.md §7) — TEK
 * merkezden (`headers()`, aşağıda) tüm route'lara uygulanır; hiçbir route
 * handler kendi başlığını elle eklemez (.claude/rules/03-security-baseline.md
 * zorunlu kontrol #6).
 */
const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'";
// `style-src 'unsafe-inline'` bilinçlidir — shadcn/ui (Radix tabanlı) bazı
// bileşenler inline style kullanır (docs/07 §7). `script-src`'de ASLA
// `'unsafe-inline'` eklenmez.

interface SecurityHeader {
  key: string;
  value: string;
}

/**
 * CORS dahil tüm güvenlik başlıklarını üretir. `APP_ORIGIN` her çağrıda
 * (modül yüklenirken değil) okunur — `with-admin-auth.ts`/`middleware.ts`
 * ile aynı ilke (testte `vi.stubEnv` ile ezilebilir). Env var tanımsızsa
 * `Access-Control-Allow-Origin` header'ı hiç eklenmez — wildcard (`*`) asla
 * kullanılmaz (docs/07 §7, .claude/rules/03-security-baseline.md #6).
 */
export function buildSecurityHeaders(): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  ];

  const productionOrigin = process.env.APP_ORIGIN;
  if (productionOrigin) {
    headers.push({ key: 'Access-Control-Allow-Origin', value: productionOrigin });
  }

  return headers;
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Tüm route'lar (API + sayfa) — docs/07 §7 "tüm route'lara" gereksinimi.
        source: '/:path*',
        headers: buildSecurityHeaders(),
      },
    ];
  },
  eslint: {
    // Lint zaten ayrı, önceki bir CI job'unda çalışıyor (`pnpm -w lint`,
    // .claude/rules/04-quality-gates.md CI Gate §1) — build adımında tekrarı
    // hem eslint-config-next gerektirir hem de sıra bağlayıcı CI gate'ini gereksiz
    // yere tekrar eder.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Proje genelinde (Faz 2/3 — apps/worker, apps/web) relative import'lar açık
    // `.js` uzantısı kullanır ("moduleResolution": "bundler" ESM konvansiyonu).
    // Next'in webpack resolver'ı bunu varsayılan olarak kaynak .ts/.tsx dosyasına
    // eşlemez (yalnızca `tsc --noEmit`/Vite bunu örtük yapıyordu) — mevcut Faz 3
    // route/servis dosyalarına dokunmadan burada açıkça eklenir.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;

import { NextResponse, type NextRequest } from 'next/server';

/**
 * İki bağımsız görev üstlenir:
 *
 * 1. `/admin/**` sayfa seviyesi koruması (docs/05_FRONTEND_SPEC.md §2,
 *    docs/07_SECURITY_IMPLEMENTATION.md §2 ve §4) — `lib/middleware/with-admin-auth.ts`
 *    (API route seviyesi, `/api/admin/*`) ile AYNI env var karşılaştırmasını yapar
 *    ama BAĞIMSIZ bir implementasyondur (defense in depth, docs/07 §4): sayfa
 *    render'ı ile API route farklı istek yaşam döngüleridir — biri güncellenirken
 *    diğeri unutulursa yine de koruma sağlanır. Bu ikisi arasında ortak kod
 *    paylaşılmaz, kasıtlı bir tekrar (risk notu: iterations/02-operator-panel-screen.md).
 *
 * 2. `Content-Security-Policy` üretimi (docs/07 §7, İterasyon 3/§5.3) — TÜM
 *    route'larda çalışır (matcher aşağıda). CSP `next.config.ts`'te DEĞİL
 *    burada üretilir çünkü Next.js App Router'ın RSC hydration script'leri
 *    (`self.__next_f.push(...)`) inline'dır ve `script-src`'de `'unsafe-inline'`
 *    KULLANILMASI YASAKTIR (docs/07 §7) — Next.js'in resmi önerisi, her
 *    istekte taze bir nonce üretip `script-src 'self' 'nonce-<rnd>'` olarak
 *    yayınlamak (https://nextjs.org/docs/app/guides/content-security-policy).
 *    Diğer statik başlıklar (X-Frame-Options/HSTS/vb.) hâlâ `next.config.ts`
 *    `headers()`'ta merkezi (.claude/rules/03-security-baseline.md kontrol #6
 *    ile tutarlı: CSP hariç tek merkez next.config.ts, CSP'nin tek merkezi
 *    de bu dosyadır — ikisi birlikte "route bazında ayrıca tanımlanmaz"
 *    ilkesini korur).
 *
 * Next.js Middleware Edge Runtime'da çalışır — Node'un `Buffer`'ı yerine
 * evrensel `atob`/`btoa` kullanılır (Edge Runtime'da mevcuttur).
 */

const WWW_AUTHENTICATE_HEADER = 'Basic realm="Terazi Operator Panel"';

/**
 * `docs/07 §7` — CSP direktifleri, `script-src` yalnızca nonce ile açılır.
 *
 * `'strict-dynamic'` zorunludur: `next/dynamic` ile lazy-load edilen chunk'lar
 * (ör. `ReturnChart`/Recharts, docs/05_FRONTEND_SPEC.md — bundle boyutu için
 * lazy-load) webpack'in kendi çalışma zamanı chunk loader'ı tarafından
 * SONRADAN enjekte edilir; bu script etiketlerinde nonce YOKTUR. `'strict-dynamic'`
 * olmadan tarayıcı bu chunk'ları CSP ihlali sayıp bloke eder (PR #26'da
 * `asset-selection-chart`/`period-change` e2e'lerinin ikinci turda hâlâ
 * kırmızı kalmasının sebebi buydu) — nonce'lı bir script tarafından
 * enjekte edilen alt script'lere güvenilmesini sağlar (Next.js'in resmi
 * nonce deseni). `'self'` eski tarayıcılar için geriye dönük uyumluluk
 * amacıyla bırakılır (strict-dynamic destekleyen tarayıcılarda yok sayılır).
 *
 * `'unsafe-eval'` YALNIZCA `development`'ta eklenir: `next dev`'in Fast
 * Refresh'i webpack modüllerini `eval()` ile sarar (React DevTools/HMR,
 * production build'de YOKTUR — `next build`/`next start` hiç eval kullanmaz).
 * Bu olmadan `pnpm --filter web dev`/Playwright smoke e2e (`next dev`
 * kullanır) tüm client-side JS'i CSP `unsafe-eval` ihlaliyle bloke eder —
 * PR #26'da tam olarak bu sebeple asset seçimi/dönem butonu interaktivitesi
 * kırıldı. Production'da (`NODE_ENV=production`) asla eklenmez.
 */
function buildContentSecurityPolicy(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    "default-src 'self'; " +
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}; ` +
    "style-src 'self' 'unsafe-inline'; " + // shadcn/ui (Radix) inline style kullanır, bilinçli istisna (docs/07 §7)
    "img-src 'self' data:; " +
    "connect-src 'self'"
  );
}

/** Her istekte taze, tahmin edilemez bir nonce (Edge Runtime — `Buffer` yok). */
function generateNonce(): string {
  return btoa(crypto.randomUUID());
}

function decodeBasicCredentials(
  authorizationHeader: string | null,
): { username: string; password: string } | null {
  if (!authorizationHeader?.startsWith('Basic ')) return null;

  const base64Credentials = authorizationHeader.slice('Basic '.length).trim();
  let decoded: string;
  try {
    decoded = atob(base64Credentials);
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

/**
 * Env var'lar her istekte okunur (modül yüklenirken değil) — `OPERATOR_USERNAME`/
 * `OPERATOR_PASSWORD` tanımsız bırakılan bir ortamda header'daki değer literal
 * "undefined" string'i olmadıkça hiçbir zaman eşleşmez (deny-by-default,
 * `lib/middleware/with-admin-auth.ts` ile aynı ilke).
 */
function isAuthorized(request: NextRequest): boolean {
  const credentials = decodeBasicCredentials(request.headers.get('authorization'));
  if (!credentials) return false;

  return (
    credentials.username === process.env.OPERATOR_USERNAME &&
    credentials.password === process.env.OPERATOR_PASSWORD
  );
}

export function middleware(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy(nonce);

  // `/admin/**` sayfa koruması yalnızca o path altında uygulanır — `/api/admin/*`
  // bu middleware'in kapsamı dışındadır (kendi `withAdminAuth` katmanı korur,
  // defense in depth). Matcher artık TÜM route'ları kapsadığı için (CSP
  // gereksinimi) bu kontrol elle path'e göre daraltılır.
  if (request.nextUrl.pathname.startsWith('/admin') && !isAuthorized(request)) {
    // Sayfa seviyesi — JSON response envelope'u gerekmez ([03_API_CONTRACTS.md §1]
    // yalnızca `/api/*` için geçerlidir); önemli olan tarayıcının native Basic Auth
    // diyaloğunu tetikleyen `WWW-Authenticate` header'ıdır (docs/07 §2 sequence).
    return new NextResponse('Bu sayfaya erişmek için kimlik doğrulaması gerekiyor.', {
      status: 401,
      headers: { 'WWW-Authenticate': WWW_AUTHENTICATE_HEADER, 'Content-Security-Policy': csp },
    });
  }

  // Next.js'in App Router render'ı, kendi ürettiği `<script>`/hydration
  // etiketlerine bu nonce'u otomatik uygulaması için hem istek header'ında
  // (`x-nonce`, Server Component'lerin `headers()` ile okuyabilmesi için)
  // hem de yanıt header'ında (`Content-Security-Policy`) taşınır — Next.js'in
  // resmi nonce deseni (docs/07 §7).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    // CSP tüm route'larda gerekli (docs/07 §7 "tüm route'lara"); yalnızca
    // Next.js'in kendi statik varlık/asset yolları hariç tutulur — bunlar
    // sayfa render'ı üretmez, CSP/nonce'un onlarda anlamı yoktur.
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};

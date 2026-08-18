import { NextResponse, type NextRequest } from 'next/server';

/**
 * `/admin/**` sayfa seviyesi koruması (docs/05_FRONTEND_SPEC.md §2,
 * docs/07_SECURITY_IMPLEMENTATION.md §2 ve §4) — `lib/middleware/with-admin-auth.ts`
 * (API route seviyesi, `/api/admin/*`) ile AYNI env var karşılaştırmasını yapar
 * ama BAĞIMSIZ bir implementasyondur (defense in depth, docs/07 §4): sayfa
 * render'ı ile API route farklı istek yaşam döngüleridir — biri güncellenirken
 * diğeri unutulursa yine de koruma sağlanır. Bu ikisi arasında ortak kod
 * paylaşılmaz, kasıtlı bir tekrar (risk notu: iterations/02-operator-panel-screen.md).
 *
 * Next.js Middleware Edge Runtime'da çalışır — Node'un `Buffer`'ı yerine
 * evrensel `atob` kullanılır (Edge Runtime'da mevcuttur).
 */

const WWW_AUTHENTICATE_HEADER = 'Basic realm="Terazi Operator Panel"';

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
  if (!isAuthorized(request)) {
    // Sayfa seviyesi — JSON response envelope'u gerekmez ([03_API_CONTRACTS.md §1]
    // yalnızca `/api/*` için geçerlidir); önemli olan tarayıcının native Basic Auth
    // diyaloğunu tetikleyen `WWW-Authenticate` header'ıdır (docs/07 §2 sequence).
    return new NextResponse('Bu sayfaya erişmek için kimlik doğrulaması gerekiyor.', {
      status: 401,
      headers: { 'WWW-Authenticate': WWW_AUTHENTICATE_HEADER },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

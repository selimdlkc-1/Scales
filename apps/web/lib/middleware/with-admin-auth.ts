import { UnauthorizedError } from '@terazi/core';
import { NextResponse, type NextRequest } from 'next/server';

import { buildErrorBody } from './response-envelope.js';

/**
 * `/api/admin/*` route'larına özel son (en iç) middleware katmanı
 * (docs/04_BACKEND_SPEC.md §4 madde 4, docs/07_SECURITY_IMPLEMENTATION.md §2-4).
 *
 * `Authorization: Basic base64(user:pass)` header'ını `OPERATOR_USERNAME`/
 * `OPERATOR_PASSWORD` ortam değişkenleriyle karşılaştırır. Eksik/hatalıysa
 * `withRateLimit`/`withValidation` ile aynı desende — `withErrorHandling`
 * üzerinden değil, doğrudan burada — `401` ile zinciri kısa devre yapar;
 * bu, tarayıcının native Basic Auth diyaloğunu tetikleyen `WWW-Authenticate`
 * header'ının yanıta eklenebilmesi içindir (docs/03_API_CONTRACTS.md §3
 * `UNAUTHORIZED` satırı).
 *
 * `apps/web/middleware.ts` (İterasyon 2, sayfa seviyesi `/admin/**` koruması)
 * ile aynı env var karşılaştırmasını yapar ama bağımsız bir implementasyondur
 * — defense in depth (docs/07 §4): biri atlanırsa/bozulursa diğeri yine de
 * korumayı sağlar.
 *
 * İterasyon 3 (§5.3, docs/07 §8, docs/03_API_CONTRACTS.md §6): ayrıca
 * başarısız Basic Auth denemeleri için `with-rate-limit.ts`'teki GENEL istek
 * limitinden BAĞIMSIZ bir brute-force sayacı tutar (IP başına dakikada 10
 * başarısız deneme) — aşımda doğru credential'la bile `429` döner (brute-force
 * penceresi kapatma).
 */

const WWW_AUTHENTICATE_HEADER = 'Basic realm="Terazi Operator Panel"';

// Mesaj metni tek kaynaktan (`UnauthorizedError`) alınır — `docs/03 §3`'teki
// `UNAUTHORIZED` mesajının route handler'da elle kopyalanmaması için.
const UNAUTHORIZED_ERROR = new UnauthorizedError();

/** Kaynak: docs/03_API_CONTRACTS.md §6 — admin brute-force satırı. */
const BRUTE_FORCE_LIMIT = 10;
const BRUTE_FORCE_WINDOW_MS = 60_000;

interface FailureCounter {
  count: number;
  resetAt: number;
}

/**
 * Modül-seviyesi paylaşımlı sayaç deposu — YALNIZCA başarısız Basic Auth
 * denemelerini sayar (`with-rate-limit.ts`'teki genel istek sayacından ayrı,
 * docs/07 §8 "ayrı bir rate limit sayacı" gereksinimi). Ayrı bir Redis
 * kurulmaz ([INF-006], `03-security-baseline.md` Rate limiting bölümü).
 */
const bruteForceStore = new Map<string, FailureCounter>();

/** Yalnızca test amaçlı: brute-force sayaç deposunu sıfırlar. */
export function resetAdminBruteForceStore(): void {
  bruteForceStore.clear();
}

// `with-rate-limit.ts`'teki `resolveClientIp` ile aynı mantık — bilinçli bir
// tekrar (o dosya bu iterasyonun dosya kapsamı dışında, bkz. iterasyon dosyası
// "Dosya kapsamı" tablosu: yalnızca `with-admin-auth.ts` güncellenir).
function resolveClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]!.trim();
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}

function registerFailedAttempt(ip: string): void {
  const now = Date.now();
  const existing = bruteForceStore.get(ip);

  if (!existing || existing.resetAt <= now) {
    bruteForceStore.set(ip, { count: 1, resetAt: now + BRUTE_FORCE_WINDOW_MS });
  } else {
    existing.count += 1;
  }
}

interface BruteForceCheck {
  blocked: boolean;
  retryAfterSeconds: number;
}

/**
 * Sayaç `isAuthorized` çağrılmadan ÖNCE kontrol edilir — limit dolduktan
 * sonraki istek, credential doğru olsa bile handler'a hiç girmeden `429`
 * alır (docs/07 §8 "doğru kimlik bilgisiyle bile 429").
 */
function checkBruteForce(ip: string): BruteForceCheck {
  const existing = bruteForceStore.get(ip);
  const now = Date.now();

  if (!existing || existing.resetAt <= now) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  if (existing.count >= BRUTE_FORCE_LIMIT) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

function bruteForceResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    buildErrorBody(
      'RATE_LIMITED',
      'Çok fazla başarısız kimlik doğrulama denemesi. Lütfen daha sonra tekrar deneyin.',
    ),
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}

function decodeBasicCredentials(
  authorizationHeader: string | null,
): { username: string; password: string } | null {
  if (!authorizationHeader?.startsWith('Basic ')) return null;

  const base64Credentials = authorizationHeader.slice('Basic '.length).trim();
  let decoded: string;
  try {
    decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
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
 * Env var'lar her istekte (modül yüklenirken değil) okunur — hem test'te
 * `vi.stubEnv` ile geçersiz kılınabilmesi hem de değeri unset bırakılan bir
 * ortamda (`OPERATOR_USERNAME`/`OPERATOR_PASSWORD` tanımsız) her isteğin
 * deny-by-default davranmasını (header'daki değer literal "undefined" string'i
 * olmadıkça hiçbir zaman eşleşmez) garanti eder.
 */
function isAuthorized(request: NextRequest): boolean {
  const credentials = decodeBasicCredentials(request.headers.get('authorization'));
  if (!credentials) return false;

  return (
    credentials.username === process.env.OPERATOR_USERNAME &&
    credentials.password === process.env.OPERATOR_PASSWORD
  );
}

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(buildErrorBody(UNAUTHORIZED_ERROR.code, UNAUTHORIZED_ERROR.message), {
    status: UNAUTHORIZED_ERROR.httpStatus,
    headers: { 'WWW-Authenticate': WWW_AUTHENTICATE_HEADER },
  });
}

export function withAdminAuth<TArgs extends unknown[]>(
  handler: (request: NextRequest, ...args: TArgs) => Promise<NextResponse>,
): (request: NextRequest, ...args: TArgs) => Promise<NextResponse> {
  return async (request: NextRequest, ...args: TArgs): Promise<NextResponse> => {
    const ip = resolveClientIp(request);
    const bruteForce = checkBruteForce(ip);
    if (bruteForce.blocked) {
      return bruteForceResponse(bruteForce.retryAfterSeconds);
    }

    if (!isAuthorized(request)) {
      registerFailedAttempt(ip);
      return unauthorizedResponse();
    }

    return handler(request, ...args);
  };
}

import { NextResponse, type NextRequest } from 'next/server';

import { buildErrorBody } from './response-envelope.js';

/** Kaynak: docs/03_API_CONTRACTS.md §6 — "Genel API" satırı. */
const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

interface RateLimitOptions {
  /** Varsayılan 60 (docs/03 §6) — testte düşük bir değerle ezilebilir. */
  limit?: number;
  /** Varsayılan 60_000ms (1 dakika, docs/03 §6). */
  windowMs?: number;
}

interface Counter {
  count: number;
  resetAt: number;
}

/**
 * Modül-seviyesi paylaşımlı sayaç deposu. `docs/03_API_CONTRACTS.md §6`'daki
 * "Genel API" limiti (asset-classes/assets/comparison/comparison/series) TEK
 * bir IP+pencere sayacı olarak uygulanır — route bazlı ayrı sayaç değil, çünkü
 * spesifikasyon bu dört route'u tek satırda gruplar. Ayrı bir Redis kurulmaz
 * ([INF-006], docs/03 §6); tek process/in-memory varsayımı [S-001] ölçeğiyle
 * tutarlıdır.
 */
const store = new Map<string, Counter>();

/** Yalnızca test amaçlı: modül-seviyesi sayaç deposunu sıfırlar. */
export function resetRateLimitStore(): void {
  store.clear();
}

function resolveClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]!.trim();
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * IP başına istek sayısını kontrol eder (docs/04_BACKEND_SPEC.md §4 madde 2,
 * [SEC-005]). Aşımda `429 RATE_LIMITED` + `Retry-After` header'ı ile zinciri
 * kısa devre yapar, handler'a hiç girmez — bu kısa devre `withErrorHandling`
 * üzerinden değil, doğrudan burada üretilir (docs/03_API_CONTRACTS.md §3
 * `RATE_LIMITED` satırı `withErrorHandling`'in exception çevrim tablosunda
 * yer almaz).
 */
export function withRateLimit<H extends (request: NextRequest) => Promise<NextResponse>>(
  handler: H,
  options: RateLimitOptions = {},
): H {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;

  const wrapped = async (request: NextRequest): Promise<NextResponse> => {
    const key = resolveClientIp(request);
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
    } else if (existing.count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

      return NextResponse.json(
        buildErrorBody('RATE_LIMITED', 'İstek limiti aşıldı. Lütfen daha sonra tekrar deneyin.'),
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      );
    } else {
      existing.count += 1;
    }

    return handler(request);
  };

  return wrapped as H;
}

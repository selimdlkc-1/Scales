import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';

import { buildErrorBody } from './response-envelope.js';

/**
 * Query parametrelerini verilen Zod şemasıyla parse eder (docs/04_BACKEND_SPEC.md
 * §4 madde 3, [SEC-006]). Hata varsa `400` ile zinciri kısa devre yapar — bu
 * kısa devre `withErrorHandling` üzerinden değil, doğrudan burada üretilir
 * (`withValidation`/`withRateLimit` kendi bilinen kısa devre durumlarını
 * kendileri üretir; `withErrorHandling` yalnızca handler'dan/servis
 * katmanından fırlayan domain exception'ları ve beklenmeyen hataları yakalar).
 *
 * **`INVALID_PERIOD` özel durumu:** `period` alanı doğrulamadan geçemezse
 * genel `VALIDATION_ERROR` yerine ayrı bir error code'a çevrilir
 * (docs/03_API_CONTRACTS.md §3 — `comparison`/`comparison/series`
 * endpoint'lerinde İterasyon 2-3'te kurulan, burada aynen korunan davranış).
 * Diğer tüm alan hataları `VALIDATION_ERROR` olarak kalır.
 *
 * Doğrulanmış, tipli veri `handler`'a ikinci parametre olarak geçirilir —
 * handler ham `URLSearchParams`'a bir daha erişmez.
 */
export function withValidation<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  handler: (request: NextRequest, query: z.infer<TSchema>) => Promise<NextResponse>,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      const periodIssue = parsed.error.issues.find((issue) => issue.path[0] === 'period');

      if (periodIssue) {
        return NextResponse.json(
          buildErrorBody('INVALID_PERIOD', 'Geçersiz dönem değeri.', {
            field: 'period',
            received: raw.period ?? null,
          }),
          { status: 400 },
        );
      }

      const firstIssue = parsed.error.issues[0];
      const field = firstIssue ? String(firstIssue.path[0]) : 'unknown';

      return NextResponse.json(
        buildErrorBody('VALIDATION_ERROR', 'Geçersiz sorgu parametresi.', {
          field,
          received: raw[field] ?? null,
        }),
        { status: 400 },
      );
    }

    return handler(request, parsed.data as z.infer<TSchema>);
  };
}

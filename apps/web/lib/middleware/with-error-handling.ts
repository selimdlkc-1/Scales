import { TeraziError } from '@terazi/core';
import { NextResponse, type NextRequest } from 'next/server';

import { buildErrorBody } from './response-envelope.js';

/**
 * En dış middleware katmanı (docs/04_BACKEND_SPEC.md §4, madde 1): sarmaladığı
 * zincirden (handler + `withRateLimit` + `withValidation`) fırlayan HER
 * exception'ı yakalar ve `docs/03_API_CONTRACTS.md §3` error taxonomy'sine
 * çevirir.
 *
 * `TeraziError` alt sınıfları (`errors.ts`, docs/04 §6) kendi `code`/`httpStatus`'unu
 * taşır — sınıf bazlı bir `instanceof` zinciri yerine tek bir taban sınıf
 * kontrolü yeterlidir; her yeni domain exception (`AssetNotFoundError`,
 * `InvalidAssetSelectionError`, ...) `TeraziError`'dan türediği sürece burada
 * ayrıca bir dal eklemeye gerek kalmaz.
 *
 * `VALIDATION_ERROR`/`INVALID_PERIOD` (`withValidation`) ve `RATE_LIMITED`
 * (`withRateLimit`) burada YAKALANMAZ — o iki middleware kendi kısa devre
 * yanıtını doğrudan üretir (docs/04 §4 madde 2-3); bu katman yalnızca
 * handler'dan (servis katmanından) fırlayan domain exception'ları ve
 * beklenmeyen hataları çevirir.
 */
export function withErrorHandling<H extends (request: NextRequest) => Promise<NextResponse>>(
  handler: H,
): H {
  const wrapped = async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof TeraziError) {
        return NextResponse.json(buildErrorBody(error.code, error.message, error.details), {
          status: error.httpStatus,
        });
      }

      // Beklenmeyen hata: orijinal hata yalnızca sunucu log'una yazılır, stack
      // trace/istisna mesajı client'a asla sızmaz (docs/04 §6, §9 — JSON log).
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Beklenmeyen hata',
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      return NextResponse.json(buildErrorBody('INTERNAL_ERROR', 'Beklenmeyen bir hata oluştu.'), {
        status: 500,
      });
    }
  };

  return wrapped as H;
}

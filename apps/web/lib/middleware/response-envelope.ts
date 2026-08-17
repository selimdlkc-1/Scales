/**
 * Response envelope yardımcıları — `docs/03_API_CONTRACTS.md §2`'deki
 * `{data,meta}` / `{error,meta}` zarfını tek yerden üretir.
 *
 * İterasyon 1-4'te her route kendi `generateRequestId()`/envelope inline
 * kodunu taşıyordu (docs/10_IMPLEMENTATION_ROADMAP.md §3.1-3.3 risk notları);
 * bu iterasyonda middleware zinciri (`with-error-handling.ts`,
 * `with-rate-limit.ts`, `with-validation.ts`) ve route handler'lar aynı
 * kaynağı paylaşır — `health` hariç (bkz. `app/api/health/route.ts`, bu
 * endpoint envelope'a hiç girmez, docs/03 §5.4).
 */

/** `meta.requestId` — log korelasyonu için rastgele kısa kimlik (docs/03 §2). */
export function generateRequestId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

export interface ResponseMeta {
  requestId: string;
  generatedAt: string;
}

/** Her başarılı/hatalı yanıtın taşıdığı `meta` bloğu (docs/03 §2). */
export function buildMeta(): ResponseMeta {
  return { requestId: generateRequestId(), generatedAt: new Date().toISOString() };
}

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: ResponseMeta;
}

/** Hata yanıtı gövdesi — `docs/03_API_CONTRACTS.md §2` hata zarfı. */
export function buildErrorBody(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ErrorResponseBody {
  return {
    error: { code, message, ...(details !== undefined && { details }) },
    meta: buildMeta(),
  };
}

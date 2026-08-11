/**
 * Domain exception hiyerarşisi (docs/04_BACKEND_SPEC.md §6, docs/03_API_CONTRACTS.md §3).
 *
 * `withErrorHandling` merkezi middleware'i (Faz 3 İterasyon 5) bu sınıfları
 * yakalayıp `error.code`/HTTP status'a çevirecek — bu iterasyonda route
 * handler'lar henüz merkezi middleware'e sahip olmadığından `instanceof` ile
 * kendi try/catch'lerinde aynı çevrimi geçici olarak elle yapar (İterasyon
 * 1-2 ile aynı desen, docs/10_IMPLEMENTATION_ROADMAP.md §3.3 risk notu).
 *
 * `UpstreamDataError` bu hiyerarşinin dışındadır — yalnızca worker job'larında
 * kullanılır, HTTP'ye hiç yansımadığı için burada tanımlanmaz (docs/04 §6).
 */
export abstract class TeraziError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

/** Zod parse hatası → `400 VALIDATION_ERROR` (docs/03 §3). */
export class ValidationError extends TeraziError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;
}

/** İstenen `symbol` aktif varlıklarda yok → `404 ASSET_NOT_FOUND` (docs/03 §3). */
export class AssetNotFoundError extends TeraziError {
  readonly code = 'ASSET_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(symbol: string) {
    super(`Varlık bulunamadı: ${symbol}`, { symbol });
  }
}

/**
 * Grafik için seçilen varlık sayısı 2'den az veya 5'ten fazla →
 * `400 INVALID_ASSET_SELECTION` (docs/03 §3, `details.count` zorunlu).
 */
export class InvalidAssetSelectionError extends TeraziError {
  readonly code = 'INVALID_ASSET_SELECTION';
  readonly httpStatus = 400;

  constructor(count: number) {
    super('Grafik için 2 ile 5 arası varlık seçilmelidir.', { count });
  }
}

/** Basic Auth eksik/hatalı → `401 UNAUTHORIZED` (docs/03 §3, yalnızca `/api/admin/*`). */
export class UnauthorizedError extends TeraziError {
  readonly code = 'UNAUTHORIZED';
  readonly httpStatus = 401;

  constructor() {
    super('Kimlik doğrulama başarısız.');
  }
}

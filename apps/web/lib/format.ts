/**
 * Sayı/tarih formatlama yardımcıları — `Intl.NumberFormat('tr-TR', ...)` ve
 * `Intl.DateTimeFormat('tr-TR', ...)` her component'te ayrı ayrı yazılmaz, tek
 * kaynak burasıdır (docs/05_FRONTEND_SPEC.md §10).
 *
 * Girdi değerleri backend'den her zaman `string` gelir ([TS-006] — `DECIMAL`
 * hassasiyeti JSON `number`/float ile bozulmasın diye). Burada yapılan
 * `Number()` dönüşümü yalnızca **gösterim** amaçlıdır, hesaplama değildir —
 * hesaplama zaten backend'de (`packages/core`) `Decimal` ile bitmiştir
 * (docs/03_API_CONTRACTS.md §1).
 */

const MISSING_VALUE_LABEL = '—';

/**
 * Ondalık oran (`"0.083047"` = %8,3047) → Türkçe yüzde string'i.
 * Renk tek başına anlam taşımaz kuralı gereği ([05] §8) işaret her zaman
 * gösterilir (`signDisplay: 'exceptZero'`).
 */
export function formatPercent(value: string | null): string {
  if (value === null) return MISSING_VALUE_LABEL;

  return new Intl.NumberFormat('tr-TR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(Number(value));
}

/** Fiyat string'i (`"32.150000"`) → Türkçe sayı formatı. */
export function formatPrice(value: string | null): string {
  if (value === null) return MISSING_VALUE_LABEL;

  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(Number(value));
}

/** ISO tarih (`"2026-08-10"`) → Türkçe kısa tarih. */
export function formatDate(value: string | null): string {
  if (value === null) return MISSING_VALUE_LABEL;

  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
}

/**
 * ISO tarih-saat (`"2026-08-10T18:32:10Z"`) → Türkçe kısa tarih + saat.
 * `S-OPERATOR-PANEL`'in kaynak sağlık kartlarındaki "son başarılı çalışma
 * zamanı" alanı için (docs/06_SCREEN_CATALOG.md §4) — yalnızca tarih değil,
 * saat de operatör için anlamlıdır (job'lar günde birden fazla kez çalışabilir).
 */
export function formatDateTime(value: string | null): string {
  if (value === null) return MISSING_VALUE_LABEL;

  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

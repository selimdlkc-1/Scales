// TEFAS (tefas.gov.tr) resmî olmayan `BindHistoryInfo` uç noktasına fetch tabanlı istek.
//
// Kural (docs/04_BACKEND_SPEC.md §1, §5): client katmanı yalnızca ham JSON döner,
// **doğrulama yapmaz** — SEC-007 doğrulaması (tefasResponseSchema + tefasFundRecordSchema,
// docs/07_SECURITY_IMPLEMENTATION.md §6) job seviyesinde (jobs/tefas-job.ts) uygulanır.
// TEFAS resmî bir API sağlamaz (docs/07 §1 threat model — "kırılgan kaynak"); client bu
// yüzden endpoint yapısı hakkında minimum varsayımla çalışır.

const TEFAS_HISTORY_URL = 'https://www.tefas.gov.tr/api/DB/BindHistoryInfo';

export interface FetchTefasHistoryParams {
  startDate: Date;
  endDate: Date;
}

/** TEFAS `bastarih`/`bittarih` form alanları DD.MM.YYYY formatında beklenir (TCMB'nin DD-MM-YYYY'sinden farklı). */
function formatTefasDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * TEFAS `BindHistoryInfo` uç noktasından ham (doğrulanmamış) JSON yanıtı döner.
 *
 * `fonkod` bilinçli olarak boş bırakılır — TEFAS bu uç noktada çoklu fon kodu
 * filtresini desteklemez, bu yüzden tarih aralığındaki **tüm** fonların verisi tek
 * istekte gelir; iz sürülen 60 fon (`docs/02_DATABASE_SCHEMA.md §9`) job seviyesinde
 * (`jobs/tefas-job.ts`) `FONKODU`'ya göre filtrelenir.
 *
 * Ağ hatası veya HTTP hata kodu (4xx/5xx) durumunda exception fırlatır — job
 * seviyesindeki retry/backoff (`docs/04_BACKEND_SPEC.md §8`) bunu yakalar.
 */
export async function fetchTefasHistory({
  startDate,
  endDate,
}: FetchTefasHistoryParams): Promise<unknown> {
  const body = new URLSearchParams({
    fontip: 'YAT',
    sfontur: '',
    fonkod: '',
    fongrup: '',
    bastarih: formatTefasDate(startDate),
    bittarih: formatTefasDate(endDate),
    fonturkod: '',
    fonunvantip: '',
  });

  const response = await fetch(TEFAS_HISTORY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`TEFAS BindHistoryInfo isteği başarısız: HTTP ${response.status}`);
  }

  return response.json();
}

// TCMB EVDS (evds2.tcmb.gov.tr) fetch tabanlı HTTP client.
//
// Kural (docs/04_BACKEND_SPEC.md §1, §5): client katmanı yalnızca ham JSON döner,
// **doğrulama yapmaz** — SEC-007 doğrulaması (tcmbEvdsResponseSchema) job seviyesinde
// (jobs/tcmb-job.ts) uygulanır. Ayrı bir HTTP kütüphanesi (axios vb.) eklenmez,
// yerleşik `fetch` kullanılır (.claude/rules/10-backend-architecture.md).

const EVDS_BASE_URL = 'https://evds2.tcmb.gov.tr/service/evds';

export interface FetchTcmbSeriesParams {
  /** EVDS seri kodları (nokta ayraçlı, örn. "TP.DK.USD.A.YTL"). Tek istekte "-" ile birleştirilir. */
  seriesCodes: string[];
  startDate: Date;
  endDate: Date;
}

/** EVDS `startDate`/`endDate` query parametreleri DD-MM-YYYY formatında beklenir. */
function formatEvdsDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * `TCMB_EVDS_API_KEY` ortam değişkenini okur (docs/04_BACKEND_SPEC.md §10, [I-002]).
 * Eksikse çağıran (job) bunu yakalayıp `JobRun.status='failed'` olarak işaretler —
 * client burada exception fırlatmaktan öte bir şey yapmaz (secrets asla loglanmaz,
 * .claude/rules/03-security-baseline.md madde 3).
 */
function getApiKey(): string {
  const apiKey = process.env.TCMB_EVDS_API_KEY;
  if (!apiKey) {
    throw new Error('TCMB_EVDS_API_KEY ortam değişkeni tanımlı değil');
  }
  return apiKey;
}

/**
 * TCMB EVDS servisinden ham (doğrulanmamış) JSON yanıtı döner.
 * Ağ hatası veya HTTP hata kodu (4xx/5xx) durumunda exception fırlatır — job
 * seviyesindeki retry/backoff (jobs/tcmb-job.ts, docs/04_BACKEND_SPEC.md §8) bunu yakalar.
 */
export async function fetchTcmbSeries({
  seriesCodes,
  startDate,
  endDate,
}: FetchTcmbSeriesParams): Promise<unknown> {
  const url = new URL(EVDS_BASE_URL);
  url.searchParams.set('series', seriesCodes.join('-'));
  url.searchParams.set('startDate', formatEvdsDate(startDate));
  url.searchParams.set('endDate', formatEvdsDate(endDate));
  url.searchParams.set('type', 'json');
  url.searchParams.set('key', getApiKey());

  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`TCMB EVDS isteği başarısız: HTTP ${response.status}`);
  }

  return response.json();
}

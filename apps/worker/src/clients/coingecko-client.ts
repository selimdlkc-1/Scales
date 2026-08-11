// CoinGecko (coingecko.com) `/coins/{id}/market_chart` uç noktasına fetch tabanlı istek.
//
// Kural (docs/04_BACKEND_SPEC.md §1, §5): client katmanı yalnızca ham JSON döner,
// **doğrulama yapmaz** — SEC-007 doğrulaması (coingeckoMarketChartResponseSchema,
// docs/07_SECURITY_IMPLEMENTATION.md §6) job seviyesinde (jobs/coingecko-job.ts)
// uygulanır. CoinGecko'nun ücretsiz katmanında birden fazla coin'in geçmiş fiyatını
// tek istekte dönen bir uç nokta yoktur (docs/10_IMPLEMENTATION_ROADMAP.md §2.3) —
// bu yüzden her coin için ayrı bir istek atılır; job seviyesinde her coin bağımsız
// retry edilir (docs/04_BACKEND_SPEC.md §8), tek bir coin'in başarısızlığı/bozukluğu
// diğerlerini etkilemez.

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

export interface FetchCoingeckoMarketChartParams {
  /** CoinGecko coin id (`assets.external_ref`, örn. "bitcoin"). */
  coinId: string;
  /** Kaç gün geriye dönük fiyat noktası istenecek (`docs/02_DATABASE_SCHEMA.md §2.2`). */
  days: number;
}

/**
 * `COINGECKO_API_KEY` ortam değişkeni varsa demo-tier header'ına eklenir
 * (`docs/04_BACKEND_SPEC.md §10`) — ücretsiz katmanda zorunlu değildir, yalnızca
 * rate limit kotasını artırır. Eksikse anahtarsız istek atılır, exception
 * fırlatılmaz (TCMB'nin aksine CoinGecko key'i opsiyoneldir).
 */
function getOptionalApiKeyHeader(): Record<string, string> {
  const apiKey = process.env.COINGECKO_API_KEY;
  return apiKey ? { 'x-cg-demo-api-key': apiKey } : {};
}

/**
 * CoinGecko `/coins/{id}/market_chart` uç noktasından ham (doğrulanmamış) JSON
 * yanıtı döner (`vs_currency=try`). Ağ hatası veya HTTP hata kodu (4xx/5xx)
 * durumunda exception fırlatır — job seviyesindeki retry/backoff
 * (`jobs/coingecko-job.ts`, `docs/04_BACKEND_SPEC.md §8`) bunu yakalar.
 */
export async function fetchCoingeckoMarketChart({
  coinId,
  days,
}: FetchCoingeckoMarketChartParams): Promise<unknown> {
  const url = new URL(`${COINGECKO_BASE_URL}/coins/${coinId}/market_chart`);
  url.searchParams.set('vs_currency', 'try');
  url.searchParams.set('days', String(days));

  const response = await fetch(url, {
    headers: { Accept: 'application/json', ...getOptionalApiKeyHeader() },
  });

  if (!response.ok) {
    throw new Error(
      `CoinGecko market_chart isteği başarısız (coinId=${coinId}): HTTP ${response.status}`,
    );
  }

  return response.json();
}

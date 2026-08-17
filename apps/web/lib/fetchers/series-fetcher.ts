import type { SeriesPeriod } from '../services/series-service.js';

// Client-side fetch sarmalayıcısı — `GET /api/comparison/series` (docs/03_API_CONTRACTS.md §5.2).
// Composite component'ler kendi fetch'ini yapmaz (.claude/rules/24-frontend-components.md);
// bu sarmalayıcı yalnızca client filtre orkestrasyonunun yaşadığı yerden (app/comparison-panel.tsx)
// çağrılır.

const RETRY_DELAY_MS = 1000;

export interface SeriesPointDto {
  date: string;
  /** `NUMERIC` — string olarak taşınır ([TS-006]); taban fiyat eksikse `null`. */
  value: string | null;
}

export interface AssetSeriesDto {
  symbol: string;
  points: SeriesPointDto[];
}

/**
 * Kaynak: docs/03_API_CONTRACTS.md §5.2 `GET /api/comparison/series` response `data`.
 * `SeriesResult`'ın (lib/services/series-service.ts) aksine yalnızca yanıt gövdesinde
 * gerçekten dönen alanları taşır — `hasCryptoAsset` route'un cache header kararı için
 * dahili bir alandır, response'a hiç serileşmez.
 */
export interface SeriesResultDto {
  period: SeriesPeriod;
  series: AssetSeriesDto[];
}

export interface FetchSeriesParams {
  period: SeriesPeriod;
  /** 2-5 sembol (docs/03 §5.2) — üst seviye (AssetSelector) bu kısıtı zaten UI'da uygular. */
  symbols: string[];
}

/** `error.message` her zaman Türkçe/gösterilebilir (docs/03_API_CONTRACTS.md §2). */
export class SeriesFetchError extends Error {
  /** HTTP durum kodu — yalnızca gerçek bir yanıt alındıysa dolu (network hatasında `undefined`). */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SeriesFetchError';
    this.status = status;
  }
}

const GENERIC_ERROR_MESSAGE = 'Veriler yüklenirken bir sorun oluştu.';

function buildQuery(params: FetchSeriesParams): string {
  return new URLSearchParams({
    period: params.period,
    assets: params.symbols.join(','),
  }).toString();
}

async function requestSeries(params: FetchSeriesParams): Promise<SeriesResultDto> {
  const response = await fetch(`/api/comparison/series?${buildQuery(params)}`);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message ?? GENERIC_ERROR_MESSAGE;
    throw new SeriesFetchError(message, response.status);
  }

  return body.data as SeriesResultDto;
}

/**
 * `4xx` (ör. `INVALID_ASSET_SELECTION`/`INVALID_PERIOD`) tekrar denense de aynı
 * sonucu verir — yalnızca `5xx`/network hatası retry'a değer
 * (docs/03_API_CONTRACTS.md §7, docs/05_FRONTEND_SPEC.md §4).
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof SeriesFetchError) {
    return error.status !== undefined && error.status >= 500;
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `fetch('/api/comparison/series?...')` — başarısız olursa (`5xx`/network) bir kez
 * otomatik retry, sabit 1s bekleme (docs/03 §7). İkinci hata çağırana
 * `SeriesFetchError` olarak yansır, çağıran taraf `error` state'ini gösterir.
 */
export async function fetchSeries(params: FetchSeriesParams): Promise<SeriesResultDto> {
  try {
    return await requestSeries(params);
  } catch (error) {
    if (!isRetryable(error)) throw error;
    await sleep(RETRY_DELAY_MS);
    return requestSeries(params);
  }
}

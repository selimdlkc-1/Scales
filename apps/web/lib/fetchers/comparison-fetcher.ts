import type {
  ComparisonPeriod,
  ComparisonResult,
  ComparisonSortBy,
  ComparisonSortDir,
} from '../services/comparison-service.js';

// Client-side fetch sarmalayıcısı — `GET /api/comparison` (docs/03_API_CONTRACTS.md §5.2).
// Composite component'ler kendi fetch'ini yapmaz (.claude/rules/24-frontend-components.md);
// bu sarmalayıcı yalnızca client filtre orkestrasyonunun yaşadığı yerden (app/comparison-panel.tsx)
// çağrılır.

const RETRY_DELAY_MS = 1000;

export interface FetchComparisonParams {
  period: ComparisonPeriod;
  sortBy: ComparisonSortBy;
  sortDir: ComparisonSortDir;
  /** Belirtilmezse tüm aktif varlıklar döner (docs/03 §5.2). */
  symbols?: string[];
}

/** `error.message` her zaman Türkçe/gösterilebilir (docs/03_API_CONTRACTS.md §2). */
export class ComparisonFetchError extends Error {
  /** HTTP durum kodu — yalnızca gerçek bir yanıt alındıysa dolu (network hatasında `undefined`). */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ComparisonFetchError';
    this.status = status;
  }
}

const GENERIC_ERROR_MESSAGE = 'Veriler yüklenirken bir sorun oluştu.';

function buildQuery(params: FetchComparisonParams): string {
  const query = new URLSearchParams({
    period: params.period,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });

  if (params.symbols && params.symbols.length > 0) {
    query.set('assets', params.symbols.join(','));
  }

  return query.toString();
}

async function requestComparison(params: FetchComparisonParams): Promise<ComparisonResult> {
  const response = await fetch(`/api/comparison?${buildQuery(params)}`);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message ?? GENERIC_ERROR_MESSAGE;
    throw new ComparisonFetchError(message, response.status);
  }

  return body.data as ComparisonResult;
}

/**
 * `4xx` (ör. `VALIDATION_ERROR`/`INVALID_PERIOD`) tekrar denense de aynı
 * sonucu verir — yalnızca `5xx`/network hatası retry'a değer
 * (docs/03_API_CONTRACTS.md §7, docs/05_FRONTEND_SPEC.md §4).
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof ComparisonFetchError) {
    return error.status !== undefined && error.status >= 500;
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `fetch('/api/comparison?...')` — başarısız olursa (`5xx`/network) bir kez
 * otomatik retry, sabit 1s bekleme (docs/03 §7). İkinci hata çağırana
 * `ComparisonFetchError` olarak yansır, çağıran taraf `error` state'ini gösterir.
 */
export async function fetchComparison(params: FetchComparisonParams): Promise<ComparisonResult> {
  try {
    return await requestComparison(params);
  } catch (error) {
    if (!isRetryable(error)) throw error;
    await sleep(RETRY_DELAY_MS);
    return requestComparison(params);
  }
}

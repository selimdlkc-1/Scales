import type { JobRunDto } from '../services/admin-service.js';

// Client-side fetch sarmalayıcısı — `GET /api/admin/job-runs` (docs/03_API_CONTRACTS.md
// §5.3). Composite component'ler kendi fetch'ini yapmaz (.claude/rules/24-frontend-components.md);
// bu sarmalayıcı yalnızca client filtre orkestrasyonunun yaşadığı yerden
// (app/admin/admin-panel.tsx) çağrılır — kaynak filtresi değişince tablo bununla
// yeniden çekilir (docs/06_SCREEN_CATALOG.md §4 "Aksiyonlar"). Basic Auth
// credential'ı tarayıcı tarafından `/admin` sayfası ilk açıldığında (middleware'in
// `WWW-Authenticate` diyaloğu) önbelleğe alınır ve aynı origin'e giden bu `fetch`
// çağrısına otomatik eklenir — burada elle bir `Authorization` header'ı set edilmez.

export type AdminDataSource = 'tcmb' | 'tefas' | 'coingecko';

export interface FetchJobRunsParams {
  /** Belirtilmezse tüm kaynakların çalıştırmaları döner (docs/03 §5.3, varsayılan "Tümü"). */
  dataSource?: AdminDataSource;
}

/** `error.message` her zaman Türkçe/gösterilebilir (docs/03_API_CONTRACTS.md §2). */
export class AdminFetchError extends Error {
  /** HTTP durum kodu — yalnızca gerçek bir yanıt alındıysa dolu (network hatasında `undefined`). */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AdminFetchError';
    this.status = status;
  }
}

const RETRY_DELAY_MS = 1000;
const GENERIC_ERROR_MESSAGE = 'Veriler yüklenirken bir sorun oluştu.';

function buildQuery(params: FetchJobRunsParams): string {
  const query = new URLSearchParams();
  if (params.dataSource) {
    query.set('dataSource', params.dataSource);
  }
  return query.toString();
}

async function requestJobRuns(params: FetchJobRunsParams): Promise<JobRunDto[]> {
  const queryString = buildQuery(params);
  const response = await fetch(`/api/admin/job-runs${queryString ? `?${queryString}` : ''}`);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message ?? GENERIC_ERROR_MESSAGE;
    throw new AdminFetchError(message, response.status);
  }

  return body.data as JobRunDto[];
}

/**
 * `4xx` (ör. `VALIDATION_ERROR`) tekrar denense de aynı sonucu verir —
 * yalnızca `5xx`/network hatası retry'a değer (docs/03_API_CONTRACTS.md §7,
 * docs/05_FRONTEND_SPEC.md §4).
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof AdminFetchError) {
    return error.status !== undefined && error.status >= 500;
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `fetch('/api/admin/job-runs?...')` — başarısız olursa (`5xx`/network) bir kez
 * otomatik retry, sabit 1s bekleme (docs/03 §7). İkinci hata çağırana
 * `AdminFetchError` olarak yansır, çağıran taraf `error` state'ini gösterir.
 */
export async function fetchJobRuns(params: FetchJobRunsParams): Promise<JobRunDto[]> {
  try {
    return await requestJobRuns(params);
  } catch (error) {
    if (!isRetryable(error)) throw error;
    await sleep(RETRY_DELAY_MS);
    return requestJobRuns(params);
  }
}

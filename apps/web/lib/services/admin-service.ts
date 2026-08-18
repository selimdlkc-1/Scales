import { findRecentJobRuns, findSourceHealthRows } from '../repositories/job-run-repository.js';

// Servis katmanı — iş kurallarını uygular (isStale hesabı), repository'yi
// çağırır, DB'nin Date/BigInt alanlarını response'un string/number
// alanlarına dönüştürür. Prisma client'a doğrudan erişmez, HTTP/route
// detayı bilmez (.claude/rules/10-backend-architecture.md).

export interface JobRunDto {
  id: number;
  dataSource: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  recordsUpserted: number;
  errorMessage: string | null;
}

export interface GetJobRunsParams {
  dataSource?: string;
  limit: number;
}

/** Kaynak: docs/03_API_CONTRACTS.md §5.3 `GET /api/admin/job-runs` response `data`. */
export async function getJobRuns(params: GetJobRunsParams): Promise<JobRunDto[]> {
  const rows = await findRecentJobRuns(params);

  return rows.map((row) => ({
    id: row.id,
    dataSource: row.dataSource,
    status: row.status,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    recordsUpserted: row.recordsUpserted,
    errorMessage: row.errorMessage,
  }));
}

export interface SourceHealthDto {
  dataSource: string;
  lastSuccessAt: string | null;
  lastRunStatus: string | null;
  isStale: boolean;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/** CoinGecko job'u her 4 saatte bir çalışır; 8 saat = 2 çalıştırma payı tolerans (docs/03 §5.3). */
const COINGECKO_STALE_THRESHOLD_MS = 8 * ONE_HOUR_MS;

/**
 * TCMB/TEFAS "1 iş günü" eşiği (docs/03_API_CONTRACTS.md §5.3): job her iş
 * günü 18:30'da çalışır (docs/04_BACKEND_SPEC.md §8). `now` Pazartesi veya
 * Pazar ise en son beklenen çalıştırma Cuma'ydı — hafta sonu boşluğu bu
 * kaynakları yanlışlıkla `isStale=true` yapmasın diye eşik o günlerde genişler.
 */
function businessDayStaleThresholdMs(now: Date): number {
  const day = now.getUTCDay(); // 0=Pazar..6=Cumartesi
  if (day === 0) return 2 * ONE_DAY_MS; // Pazar: Cuma çalıştırması hâlâ taze
  if (day === 1) return 3 * ONE_DAY_MS; // Pazartesi: Cuma çalıştırması hâlâ taze
  return ONE_DAY_MS;
}

function isSourceStale(dataSource: string, lastSuccessAt: Date | null, now: Date): boolean {
  if (!lastSuccessAt) return true;

  const elapsedMs = now.getTime() - lastSuccessAt.getTime();
  const thresholdMs =
    dataSource === 'coingecko' ? COINGECKO_STALE_THRESHOLD_MS : businessDayStaleThresholdMs(now);

  return elapsedMs > thresholdMs;
}

/**
 * Kaynak: docs/03_API_CONTRACTS.md §5.3 `GET /api/admin/sources` response
 * `data`. `now` parametresi yalnızca testte deterministik `isStale`
 * doğrulaması için geçirilir, route handler varsayılanı (`new Date()`) kullanır.
 */
export async function getSourceHealth(now: Date = new Date()): Promise<SourceHealthDto[]> {
  const rows = await findSourceHealthRows();

  return rows.map((row) => ({
    dataSource: row.dataSource,
    lastSuccessAt: row.lastSuccessAt ? row.lastSuccessAt.toISOString() : null,
    lastRunStatus: row.lastRunStatus,
    isStale: isSourceStale(row.dataSource, row.lastSuccessAt, now),
  }));
}

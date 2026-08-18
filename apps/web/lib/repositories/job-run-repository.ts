import { prisma } from '@terazi/core';

// Repository katmanı — Prisma sorgularının tek bulunduğu yer, servise düz TS
// nesnesi döner, `Prisma.JobRunGetPayload` tipini dışarı sızdırmaz
// (.claude/rules/10-backend-architecture.md). Doğrudan test dosyası yok —
// `admin-service.ts` (mock'lu) ve `app/api/admin/*/route.test.ts` (gerçek DB'ye
// karşı) bu katmanı dolaylı olarak egzersiz eder (İterasyon 1 dosya kapsamı).

export interface JobRunRow {
  id: number;
  dataSource: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  recordsUpserted: number;
  errorMessage: string | null;
}

interface RawJobRun {
  id: bigint;
  dataSource: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  recordsUpserted: number;
  errorMessage: string | null;
}

/** `id` `BigInt` olarak gelir (JSON.stringify edilemez) — küçük bir sayı olduğu garanti olduğundan `Number`'a çevrilir. */
function toJobRunRow(row: RawJobRun): JobRunRow {
  return {
    id: Number(row.id),
    dataSource: row.dataSource,
    status: row.status,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    recordsUpserted: row.recordsUpserted,
    errorMessage: row.errorMessage,
  };
}

export interface FindRecentJobRunsParams {
  /** Belirtilirse yalnızca bu kaynağın çalıştırmaları döner (docs/03_API_CONTRACTS.md §5.3). */
  dataSource?: string;
  /** Dönecek maksimum kayıt sayısı. */
  limit: number;
}

/**
 * Son worker çalıştırmaları, en yeni önce. `(data_source, started_at DESC)`
 * index'i bu sorguyu destekler (docs/02_DATABASE_SCHEMA.md §4).
 *
 * `nulls: 'last'`: `status='pending'` satırlarında `started_at` henüz
 * `NULL`'dır (`job-lifecycle.ts` `createPendingJobRun`) — Postgres'in `DESC`
 * için varsayılanı `NULLS FIRST` olduğundan, bu belirtilmezse henüz
 * başlamamış bir çalıştırma yanlışlıkla "en yeni" görünür.
 * Kaynak: docs/03_API_CONTRACTS.md §5.3 `GET /api/admin/job-runs`.
 */
export async function findRecentJobRuns({
  dataSource,
  limit,
}: FindRecentJobRunsParams): Promise<JobRunRow[]> {
  const rows = await prisma.jobRun.findMany({
    where: dataSource ? { dataSource } : undefined,
    orderBy: { startedAt: { sort: 'desc', nulls: 'last' } },
    take: limit,
  });

  return rows.map(toJobRunRow);
}

const KNOWN_DATA_SOURCES = ['tcmb', 'tefas', 'coingecko'] as const;

export interface SourceHealthRow {
  dataSource: string;
  /** En son BAŞARILI (`status='success'`) çalıştırmanın zamanı; hiç yoksa `null`. */
  lastSuccessAt: Date | null;
  /** En son çalıştırmanın durumu (başarılı olması gerekmez); hiç çalıştırma yoksa `null`. */
  lastRunStatus: string | null;
}

/**
 * Her veri kaynağı için en son çalıştırma durumu + en son başarılı çalışma
 * zamanının ham kaynağı — `isStale` hesabı servis katmanında yapılır
 * (docs/03_API_CONTRACTS.md §5.3 `GET /api/admin/sources`). `job_runs`
 * hacmi küçük olduğundan ([S-001]) üç sabit kaynak için ayrı sorgu grubu
 * yeterlidir, ayrı bir agregasyon view'ı kurulmaz.
 */
export async function findSourceHealthRows(): Promise<SourceHealthRow[]> {
  return Promise.all(
    KNOWN_DATA_SOURCES.map(async (dataSource) => {
      const [lastRun, lastSuccess] = await Promise.all([
        prisma.jobRun.findFirst({
          where: { dataSource },
          orderBy: { startedAt: { sort: 'desc', nulls: 'last' } },
        }),
        prisma.jobRun.findFirst({
          where: { dataSource, status: 'success' },
          orderBy: { startedAt: { sort: 'desc', nulls: 'last' } },
        }),
      ]);

      return {
        dataSource,
        lastRunStatus: lastRun?.status ?? null,
        lastSuccessAt: lastSuccess?.startedAt ?? null,
      };
    }),
  );
}

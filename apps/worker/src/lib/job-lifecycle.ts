// JobRun state machine helper — docs/01_DOMAIN_MODEL.md §5 state diagram:
// pending → running → success/partial/failed. TCMB/TEFAS/CoinGecko job'larının
// üçü de bu üç fonksiyonu kullanır (Faz 2 §2.4 refactor,
// docs/10_IMPLEMENTATION_ROADMAP.md §2.4); davranış öncekiyle birebir aynıdır,
// yalnızca üç job dosyasında tekrarlanan inline kod kaldırılmıştır.
import { prisma } from '@terazi/core';
import type { JobRun } from '@prisma/client';

/** Terminal durumlar — docs/01_DOMAIN_MODEL.md §5 state diagram'ındaki üç çıkış. */
export type JobRunStatus = 'success' | 'partial' | 'failed';

export interface FinishJobRunInput {
  status: JobRunStatus;
  recordsUpserted: number;
  errorMessage: string | null;
}

/**
 * `[*] → pending`: cron zamanlayıcı job'u tetikledi, worker henüz başlamadı.
 * `job_runs`'a `status='pending'`, `started_at=NULL` ile yeni satır ekler.
 */
export async function createPendingJobRun(dataSource: string): Promise<JobRun> {
  return prisma.jobRun.create({ data: { dataSource, status: 'pending' } });
}

/**
 * `pending → running`: worker fiilen çalışmaya başladı, dış kaynağa istek atıyor.
 * Aynı satırı `status='running'`, `started_at=now()` ile günceller.
 */
export async function markRunning(jobRunId: bigint): Promise<void> {
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: { status: 'running', startedAt: new Date() },
  });
}

/**
 * `running → success/partial/failed`: terminal durum. `finished_at=now()`,
 * `records_upserted` ve (varsa) `error_message` ile satırı kapatır.
 */
export async function finishJobRun(jobRunId: bigint, input: FinishJobRunInput): Promise<void> {
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: {
      status: input.status,
      finishedAt: new Date(),
      recordsUpserted: input.recordsUpserted,
      errorMessage: input.errorMessage,
    },
  });
}

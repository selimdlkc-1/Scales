// Unit test — `prisma` mock'lanır (`@terazi/core`'un tek export'u), gerçek DB'ye
// gitmez. `job_runs.data_source` bir CHECK constraint'i ile ('tcmb'|'tefas'|
// 'coingecko') sınırlıdır (packages/core/prisma/migrations —
// `job_runs_data_source_check`); bu üç değerin her biri zaten kendi
// jobs/*.test.ts dosyasında `beforeEach`'te toplu silinir (idempotent seed +
// temizlik deseni) — gerçek DB'ye karşı ayrı bir "sahte" `job_runs` satırı
// oluşturmak, o dosyalarla paralel çalışırken satırın ortadan kaldırılmasına
// (race condition) yol açar. Bu modül yalnızca `prisma.jobRun.create/update`'i
// doğru argümanlarla çağıran ince bir sarmalayıcı olduğundan, docs/01_DOMAIN_MODEL.md
// §5 state diagram'ındaki her geçiş burada mock ile doğrulanır.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockJobRunCreate = vi.fn();
const mockJobRunUpdate = vi.fn();

vi.mock('@terazi/core', () => ({
  prisma: {
    jobRun: {
      create: (...args: unknown[]) => mockJobRunCreate(...args),
      update: (...args: unknown[]) => mockJobRunUpdate(...args),
    },
  },
}));

const { createPendingJobRun, finishJobRun, markRunning } = await import('./job-lifecycle.js');

describe('job-lifecycle', () => {
  beforeEach(() => {
    mockJobRunCreate.mockReset();
    mockJobRunUpdate.mockReset();
  });

  it('createPendingJobRun: `[*] → pending` — dataSource ve status="pending" ile create çağırır', async () => {
    const created = {
      id: 1n,
      dataSource: 'tcmb',
      status: 'pending',
      startedAt: null,
      finishedAt: null,
    };
    mockJobRunCreate.mockResolvedValue(created);

    const jobRun = await createPendingJobRun('tcmb');

    expect(mockJobRunCreate).toHaveBeenCalledWith({
      data: { dataSource: 'tcmb', status: 'pending' },
    });
    expect(jobRun).toBe(created);
  });

  it('markRunning: `pending → running` — status="running" ve started_at=now() ile update çağırır', async () => {
    mockJobRunUpdate.mockResolvedValue({});

    await markRunning(1n);

    expect(mockJobRunUpdate).toHaveBeenCalledWith({
      where: { id: 1n },
      data: { status: 'running', startedAt: expect.any(Date) },
    });
  });

  it('finishJobRun: `running → success` — finished_at/records_upserted dolu, error_message null', async () => {
    mockJobRunUpdate.mockResolvedValue({});

    await finishJobRun(1n, { status: 'success', recordsUpserted: 9, errorMessage: null });

    expect(mockJobRunUpdate).toHaveBeenCalledWith({
      where: { id: 1n },
      data: {
        status: 'success',
        finishedAt: expect.any(Date),
        recordsUpserted: 9,
        errorMessage: null,
      },
    });
  });

  it('finishJobRun: `running → partial` — error_message atlanan kayıt bilgisini taşır', async () => {
    mockJobRunUpdate.mockResolvedValue({});

    await finishJobRun(2n, {
      status: 'partial',
      recordsUpserted: 8,
      errorMessage: '1 kayıt geçersiz değer nedeniyle atlandı',
    });

    expect(mockJobRunUpdate).toHaveBeenCalledWith({
      where: { id: 2n },
      data: {
        status: 'partial',
        finishedAt: expect.any(Date),
        recordsUpserted: 8,
        errorMessage: '1 kayıt geçersiz değer nedeniyle atlandı',
      },
    });
  });

  it('finishJobRun: `running → failed` — records_upserted=0, error_message dolu', async () => {
    mockJobRunUpdate.mockResolvedValue({});

    await finishJobRun(3n, { status: 'failed', recordsUpserted: 0, errorMessage: 'ECONNRESET' });

    expect(mockJobRunUpdate).toHaveBeenCalledWith({
      where: { id: 3n },
      data: {
        status: 'failed',
        finishedAt: expect.any(Date),
        recordsUpserted: 0,
        errorMessage: 'ECONNRESET',
      },
    });
  });
});

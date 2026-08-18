// Unit test — repository `vi.mock()` ile taklit edilir, gerçek DB'ye gitmez
// (.claude/rules/10-backend-architecture.md). `isStale` iş kuralı (docs/03
// §5.3) burada, gerçek zamana bağlı olmadan sabit `now` değerleriyle test edilir.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindRecentJobRuns = vi.fn();
const mockFindSourceHealthRows = vi.fn();

vi.mock('../repositories/job-run-repository.js', () => ({
  findRecentJobRuns: (...args: unknown[]) => mockFindRecentJobRuns(...args),
  findSourceHealthRows: (...args: unknown[]) => mockFindSourceHealthRows(...args),
}));

const { getJobRuns, getSourceHealth } = await import('./admin-service.js');

describe('admin-service', () => {
  beforeEach(() => {
    mockFindRecentJobRuns.mockReset();
    mockFindSourceHealthRows.mockReset();
  });

  describe('getJobRuns', () => {
    it('repository parametrelerini iletir, Date alanlarını ISO string’e çevirir', async () => {
      mockFindRecentJobRuns.mockResolvedValue([
        {
          id: 1042,
          dataSource: 'tefas',
          status: 'partial',
          startedAt: new Date('2026-08-10T15:30:02Z'),
          finishedAt: new Date('2026-08-10T15:31:47Z'),
          recordsUpserted: 58,
          errorMessage: '2 kayıt şema doğrulamasından geçemedi',
        },
      ]);

      const result = await getJobRuns({ dataSource: 'tefas', limit: 50 });

      expect(mockFindRecentJobRuns).toHaveBeenCalledWith({ dataSource: 'tefas', limit: 50 });
      expect(result).toEqual([
        {
          id: 1042,
          dataSource: 'tefas',
          status: 'partial',
          startedAt: '2026-08-10T15:30:02.000Z',
          finishedAt: '2026-08-10T15:31:47.000Z',
          recordsUpserted: 58,
          errorMessage: '2 kayıt şema doğrulamasından geçemedi',
        },
      ]);
    });

    it('startedAt/finishedAt null ise (pending çalıştırma) null olarak kalır', async () => {
      mockFindRecentJobRuns.mockResolvedValue([
        {
          id: 1,
          dataSource: 'tcmb',
          status: 'pending',
          startedAt: null,
          finishedAt: null,
          recordsUpserted: 0,
          errorMessage: null,
        },
      ]);

      const result = await getJobRuns({ limit: 50 });

      expect(result[0]).toEqual(
        expect.objectContaining({ startedAt: null, finishedAt: null, status: 'pending' }),
      );
    });
  });

  describe('getSourceHealth', () => {
    const NOW = new Date('2026-08-18T12:00:00Z'); // Salı

    it('coingecko: 8 saatten eski başarı isStale=true döner', async () => {
      mockFindSourceHealthRows.mockResolvedValue([
        {
          dataSource: 'coingecko',
          lastSuccessAt: new Date('2026-08-18T02:00:00Z'), // 10 saat önce
          lastRunStatus: 'success',
        },
      ]);

      const result = await getSourceHealth(NOW);

      expect(result).toEqual([
        {
          dataSource: 'coingecko',
          lastSuccessAt: '2026-08-18T02:00:00.000Z',
          lastRunStatus: 'success',
          isStale: true,
        },
      ]);
    });

    it('coingecko: 8 saat içindeki başarı isStale=false döner', async () => {
      mockFindSourceHealthRows.mockResolvedValue([
        {
          dataSource: 'coingecko',
          lastSuccessAt: new Date('2026-08-18T06:00:00Z'), // 6 saat önce
          lastRunStatus: 'success',
        },
      ]);

      const result = await getSourceHealth(NOW);

      expect(result[0]?.isStale).toBe(false);
    });

    it('tcmb/tefas: 1 iş gününden eski başarı isStale=true döner (hafta içi eşik: 24 saat)', async () => {
      mockFindSourceHealthRows.mockResolvedValue([
        {
          dataSource: 'tefas',
          lastSuccessAt: new Date('2026-08-16T18:35:00Z'), // Pazar — 2 gün önce, hafta içi eşiği (24s) aşıyor
          lastRunStatus: 'failed',
        },
      ]);

      const result = await getSourceHealth(NOW);

      expect(result[0]).toEqual({
        dataSource: 'tefas',
        lastSuccessAt: '2026-08-16T18:35:00.000Z',
        lastRunStatus: 'failed',
        isStale: true,
      });
    });

    it('tcmb/tefas: bir önceki iş günü içindeki başarı isStale=false döner', async () => {
      mockFindSourceHealthRows.mockResolvedValue([
        {
          dataSource: 'tcmb',
          lastSuccessAt: new Date('2026-08-17T18:35:00Z'), // dün (Pazartesi) — 1 gün önce
          lastRunStatus: 'success',
        },
      ]);

      const result = await getSourceHealth(NOW);

      expect(result[0]?.isStale).toBe(false);
    });

    it('Pazartesi kontrolünde Cuma çalıştırması hâlâ taze sayılır (hafta sonu boşluğu)', async () => {
      const MONDAY = new Date('2026-08-17T10:00:00Z'); // Pazartesi
      mockFindSourceHealthRows.mockResolvedValue([
        {
          dataSource: 'tcmb',
          lastSuccessAt: new Date('2026-08-14T18:35:00Z'), // önceki Cuma
          lastRunStatus: 'success',
        },
      ]);

      const result = await getSourceHealth(MONDAY);

      expect(result[0]?.isStale).toBe(false);
    });

    it('hiç başarılı çalıştırma yoksa (lastSuccessAt=null) isStale=true döner', async () => {
      mockFindSourceHealthRows.mockResolvedValue([
        { dataSource: 'coingecko', lastSuccessAt: null, lastRunStatus: 'failed' },
      ]);

      const result = await getSourceHealth(NOW);

      expect(result[0]).toEqual({
        dataSource: 'coingecko',
        lastSuccessAt: null,
        lastRunStatus: 'failed',
        isStale: true,
      });
    });
  });
});

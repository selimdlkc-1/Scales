// Unit test — repository'ler `vi.mock()` ile taklit edilir, gerçek DB'ye gitmez
// (.claude/rules/10-backend-architecture.md).
//
// `findNearestPriceOnOrBefore` her varlık için `Promise.all([start, end])`
// içinde sırayla (senkron olarak, await'ten önce) çağrılır — `mockResolvedValueOnce`
// zinciri bu yüzden varlık sırasına göre [start, end, start, end, ...] şeklinde
// deterministiktir (bkz. `comparison-service.ts` `buildRow`).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindComparableAssets = vi.fn();
const mockFindNearestPriceOnOrBefore = vi.fn();
const mockFindNearestCpiOnOrBefore = vi.fn();

vi.mock('../repositories/asset-price-repository.js', () => ({
  findComparableAssets: (...args: unknown[]) => mockFindComparableAssets(...args),
  findNearestPriceOnOrBefore: (...args: unknown[]) => mockFindNearestPriceOnOrBefore(...args),
}));
vi.mock('../repositories/cpi-repository.js', () => ({
  findNearestCpiOnOrBefore: (...args: unknown[]) => mockFindNearestCpiOnOrBefore(...args),
}));

const { getComparison } = await import('./comparison-service.js');

describe('comparison-service', () => {
  beforeEach(() => {
    mockFindComparableAssets.mockReset();
    mockFindNearestPriceOnOrBefore.mockReset();
    mockFindNearestCpiOnOrBefore.mockReset();
    mockFindNearestCpiOnOrBefore.mockResolvedValue({ periodMonth: '2026-07', indexValue: '1100' });
  });

  it('dolu veri için doğru nominal/reel getiriyi hesaplar (status=ok)', async () => {
    mockFindComparableAssets.mockResolvedValue([
      { id: 1n, symbol: 'USDTRY', assetClassCode: 'fx' },
    ]);
    mockFindNearestPriceOnOrBefore
      .mockResolvedValueOnce({ asOfDate: '2025-08-10', price: '100' }) // start
      .mockResolvedValueOnce({ asOfDate: '2026-08-10', price: '120' }); // end

    const result = await getComparison({ period: '1y', sortBy: 'realReturn', sortDir: 'desc' });

    expect(result.period).toBe('1y');
    expect(result.rows).toEqual([
      {
        symbol: 'USDTRY',
        assetClass: 'fx',
        status: 'ok',
        startPrice: '100',
        endPrice: '120',
        startDate: '2025-08-10',
        endDate: '2026-08-10',
        nominalReturn: '0.200000',
        realReturn: expect.any(String),
        asOfDate: '2026-08-10',
      },
    ]);
  });

  it("eksik başlangıç fiyatında status='unavailable' döner, diğer alanlar null", async () => {
    mockFindComparableAssets.mockResolvedValue([
      { id: 2n, symbol: 'TEFAS:AFA', assetClassCode: 'fund' },
    ]);
    mockFindNearestPriceOnOrBefore
      .mockResolvedValueOnce(null) // start
      .mockResolvedValueOnce({ asOfDate: '2026-08-10', price: '10' }); // end

    const result = await getComparison({ period: '1y', sortBy: 'realReturn', sortDir: 'desc' });

    expect(result.rows).toEqual([
      {
        symbol: 'TEFAS:AFA',
        assetClass: 'fund',
        status: 'unavailable',
        startPrice: null,
        endPrice: null,
        startDate: null,
        endDate: null,
        nominalReturn: null,
        realReturn: null,
        asOfDate: null,
      },
    ]);
  });

  it("TÜFE verisi eksikse status='unavailable' döner", async () => {
    mockFindComparableAssets.mockResolvedValue([
      { id: 3n, symbol: 'BTC', assetClassCode: 'crypto' },
    ]);
    mockFindNearestPriceOnOrBefore.mockResolvedValue({ asOfDate: '2026-08-10', price: '100' });
    mockFindNearestCpiOnOrBefore.mockReset();
    mockFindNearestCpiOnOrBefore
      .mockResolvedValueOnce(null) // start cpi
      .mockResolvedValueOnce({ periodMonth: '2026-08', indexValue: '1200' }); // end cpi

    const result = await getComparison({ period: '1m', sortBy: 'realReturn', sortDir: 'desc' });

    expect(result.rows[0]?.status).toBe('unavailable');
  });

  it('sortBy=symbol, sortDir=asc alfabetik sıralar', async () => {
    mockFindComparableAssets.mockResolvedValue([
      { id: 1n, symbol: 'USDTRY', assetClassCode: 'fx' },
      { id: 2n, symbol: 'BTC', assetClassCode: 'crypto' },
      { id: 3n, symbol: 'EURTRY', assetClassCode: 'fx' },
    ]);
    mockFindNearestPriceOnOrBefore.mockResolvedValue({ asOfDate: '2026-08-10', price: '100' });

    const result = await getComparison({ period: '1m', sortBy: 'symbol', sortDir: 'asc' });

    expect(result.rows.map((row) => row.symbol)).toEqual(['BTC', 'EURTRY', 'USDTRY']);
  });

  it('sortBy=nominalReturn, sortDir=desc büyükten küçüğe sıralar; unavailable satır sonda kalır', async () => {
    mockFindComparableAssets.mockResolvedValue([
      { id: 1n, symbol: 'LOW', assetClassCode: 'fx' },
      { id: 2n, symbol: 'HIGH', assetClassCode: 'fx' },
      { id: 3n, symbol: 'NONE', assetClassCode: 'fx' },
    ]);
    mockFindNearestPriceOnOrBefore
      .mockResolvedValueOnce({ asOfDate: '2026-07-10', price: '100' }) // LOW start
      .mockResolvedValueOnce({ asOfDate: '2026-08-10', price: '110' }) // LOW end (nominal 0.1)
      .mockResolvedValueOnce({ asOfDate: '2026-07-10', price: '100' }) // HIGH start
      .mockResolvedValueOnce({ asOfDate: '2026-08-10', price: '200' }) // HIGH end (nominal 1.0)
      .mockResolvedValueOnce(null) // NONE start
      .mockResolvedValueOnce({ asOfDate: '2026-08-10', price: '50' }); // NONE end

    const result = await getComparison({ period: '1m', sortBy: 'nominalReturn', sortDir: 'desc' });

    expect(result.rows.map((row) => row.symbol)).toEqual(['HIGH', 'LOW', 'NONE']);
  });

  it('assets filtresini repository çağrısına iletir', async () => {
    mockFindComparableAssets.mockResolvedValue([]);

    await getComparison({
      symbols: ['USDTRY', 'BTC'],
      period: '3m',
      sortBy: 'realReturn',
      sortDir: 'desc',
    });

    expect(mockFindComparableAssets).toHaveBeenCalledWith({ symbols: ['USDTRY', 'BTC'] });
  });
});

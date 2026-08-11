// Unit test — repository `vi.mock()` ile taklit edilir, gerçek DB'ye gitmez
// (.claude/rules/10-backend-architecture.md), `comparison-service.test.ts` ile
// aynı desen.
import { InvalidAssetSelectionError } from '@terazi/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindComparableAssets = vi.fn();
const mockFindNearestPriceOnOrBefore = vi.fn();

vi.mock('../repositories/asset-price-repository.js', () => ({
  findComparableAssets: (...args: unknown[]) => mockFindComparableAssets(...args),
  findNearestPriceOnOrBefore: (...args: unknown[]) => mockFindNearestPriceOnOrBefore(...args),
}));

const { getComparisonSeries } = await import('./series-service.js');

describe('series-service', () => {
  beforeEach(() => {
    mockFindComparableAssets.mockReset();
    mockFindNearestPriceOnOrBefore.mockReset();
  });

  it('2 varlık (alt sınır) için normalize edilmiş seriyi üretir, dönem başı 100', async () => {
    mockFindComparableAssets.mockResolvedValue([
      { id: 1n, symbol: 'USDTRY', assetClassCode: 'fx' },
      { id: 2n, symbol: 'EURTRY', assetClassCode: 'fx' },
    ]);
    mockFindNearestPriceOnOrBefore.mockResolvedValue({ asOfDate: '2026-07-10', price: '100' });

    const result = await getComparisonSeries({ symbols: ['USDTRY', 'EURTRY'], period: '1m' });

    expect(result.period).toBe('1m');
    expect(result.series).toHaveLength(2);
    expect(result.hasCryptoAsset).toBe(false);
    for (const assetSeries of result.series) {
      expect(assetSeries.points[0]?.value).toBe('100.000000');
    }
  });

  it('5 varlık (üst sınır) için de başarıyla çalışır', async () => {
    mockFindComparableAssets.mockResolvedValue([
      { id: 1n, symbol: 'A', assetClassCode: 'fx' },
      { id: 2n, symbol: 'B', assetClassCode: 'fund' },
      { id: 3n, symbol: 'C', assetClassCode: 'fund' },
      { id: 4n, symbol: 'D', assetClassCode: 'gold' },
      { id: 5n, symbol: 'E', assetClassCode: 'crypto' },
    ]);
    mockFindNearestPriceOnOrBefore.mockResolvedValue({ asOfDate: '2026-07-10', price: '10' });

    const result = await getComparisonSeries({
      symbols: ['A', 'B', 'C', 'D', 'E'],
      period: '3m',
    });

    expect(result.series).toHaveLength(5);
    expect(result.hasCryptoAsset).toBe(true);
  });

  it("çözülen varlık sayısı 2'den azsa InvalidAssetSelectionError fırlatır (1 varlık)", async () => {
    mockFindComparableAssets.mockResolvedValue([
      { id: 1n, symbol: 'USDTRY', assetClassCode: 'fx' },
    ]);

    await expect(getComparisonSeries({ symbols: ['USDTRY'], period: '1y' })).rejects.toThrow(
      InvalidAssetSelectionError,
    );
  });

  it("çözülen varlık sayısı 5'ten fazlaysa InvalidAssetSelectionError fırlatır (6 varlık)", async () => {
    mockFindComparableAssets.mockResolvedValue(
      ['A', 'B', 'C', 'D', 'E', 'F'].map((symbol, index) => ({
        id: BigInt(index + 1),
        symbol,
        assetClassCode: 'fx',
      })),
    );

    await expect(
      getComparisonSeries({ symbols: ['A', 'B', 'C', 'D', 'E', 'F'], period: '1y' }),
    ).rejects.toThrow(InvalidAssetSelectionError);
  });

  it('geçersiz sembol istenen varlık sayısını 2 altına düşürürse InvalidAssetSelectionError fırlatır', async () => {
    // İstekte 2 sembol var ama biri DB'de yok — findComparableAssets yalnızca
    // bulduğunu döner (docs/03 §5.2 series için ASSET_NOT_FOUND dokümante
    // edilmemiştir, bkz. series-service.ts üstteki yorum).
    mockFindComparableAssets.mockResolvedValue([
      { id: 1n, symbol: 'USDTRY', assetClassCode: 'fx' },
    ]);

    await expect(
      getComparisonSeries({ symbols: ['USDTRY', 'NOPE'], period: '1y' }),
    ).rejects.toThrow(InvalidAssetSelectionError);
    expect(mockFindComparableAssets).toHaveBeenCalledWith({ symbols: ['USDTRY', 'NOPE'] });
  });

  it('başlangıç fiyatı eksikse o varlığın tüm noktaları null döner (tahmini üretilmez)', async () => {
    mockFindComparableAssets.mockResolvedValue([
      { id: 1n, symbol: 'USDTRY', assetClassCode: 'fx' },
      { id: 2n, symbol: 'TEFAS:AFA', assetClassCode: 'fund' },
    ]);
    mockFindNearestPriceOnOrBefore
      .mockResolvedValueOnce({ asOfDate: '2026-07-10', price: '100' }) // USDTRY start
      .mockResolvedValueOnce({ asOfDate: '2026-08-10', price: '110' }) // USDTRY end
      .mockResolvedValueOnce(null) // TEFAS:AFA start
      .mockResolvedValueOnce(null); // TEFAS:AFA end

    const result = await getComparisonSeries({
      symbols: ['USDTRY', 'TEFAS:AFA'],
      period: '1m',
    });

    const fundSeries = result.series.find((series) => series.symbol === 'TEFAS:AFA');
    expect(fundSeries?.points.every((point) => point.value === null)).toBe(true);
  });

  it('sembol listesini repository çağrısına iletir', async () => {
    mockFindComparableAssets.mockResolvedValue([
      { id: 1n, symbol: 'USDTRY', assetClassCode: 'fx' },
      { id: 2n, symbol: 'BTC', assetClassCode: 'crypto' },
    ]);
    mockFindNearestPriceOnOrBefore.mockResolvedValue({ asOfDate: '2026-07-10', price: '100' });

    await getComparisonSeries({ symbols: ['USDTRY', 'BTC'], period: '5y' });

    expect(mockFindComparableAssets).toHaveBeenCalledWith({ symbols: ['USDTRY', 'BTC'] });
  });
});

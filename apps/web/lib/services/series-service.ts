import { calculateNormalizedReturnSeries, InvalidAssetSelectionError } from '@terazi/core';

import {
  findComparableAssets,
  findNearestPriceOnOrBefore,
} from '../repositories/asset-price-repository.js';

// Servis katmanı — repository'leri + `packages/core`'daki tek kaynak hesap
// fonksiyonlarını çağırır. Reel/nominal getiride olduğu gibi normalize edilmiş
// getiri de burada yeniden implemente edilmez (docs/01_DOMAIN_MODEL.md §6),
// yalnızca import edilir. Prisma client'a doğrudan erişmez
// (.claude/rules/10-backend-architecture.md).

export type SeriesPeriod = '1m' | '3m' | '1y' | '3y' | '5y';

export interface SeriesPoint {
  date: string;
  /** `NUMERIC` — string olarak taşınır ([TS-006]); taban fiyat eksikse `null`. */
  value: string | null;
}

export interface AssetSeries {
  symbol: string;
  points: SeriesPoint[];
}

export interface GetSeriesParams {
  symbols: string[];
  period: SeriesPeriod;
}

export interface SeriesResult {
  period: SeriesPeriod;
  series: AssetSeries[];
  /**
   * Route'un cache header kararı için — `data.series` öğeleri
   * `assetClass` taşımaz (docs/03_API_CONTRACTS.md §5.2 `{period,series}`
   * response şekli), bu alan yalnızca dahili kullanım içindir.
   */
  hasCryptoAsset: boolean;
}

const MIN_ASSETS = 2;
const MAX_ASSETS = 5;

/** Dönem enum'unu ay sayısına çevirir — örnekleme noktaları bu aralıkta aylık üretilir. */
const PERIOD_MONTHS: Record<SeriesPeriod, number> = {
  '1m': 1,
  '3m': 3,
  '1y': 12,
  '3y': 36,
  '5y': 60,
};

/**
 * `comparison-service.ts`'teki `subtractPeriod` ile birebir aynı dönüşüm
 * (docs/10_IMPLEMENTATION_ROADMAP.md §3.2 risk notu bu tekrarı önceden
 * işaretlemişti). Bu iterasyonun kapsamı `comparison-service.ts`'e dokunmayı
 * yasaklıyor (bkz. iterasyon dosyası "Dokunma" satırı), bu yüzden burada ayrı
 * tanımlanır — ortaklaştırma İterasyon 5'in (middleware/ortak yardımcı
 * çıkarma) kapsamındadır.
 */
function subtractPeriod(from: Date, period: SeriesPeriod): Date {
  const result = new Date(from);

  switch (period) {
    case '1m':
      result.setUTCMonth(result.getUTCMonth() - 1);
      break;
    case '3m':
      result.setUTCMonth(result.getUTCMonth() - 3);
      break;
    case '1y':
      result.setUTCFullYear(result.getUTCFullYear() - 1);
      break;
    case '3y':
      result.setUTCFullYear(result.getUTCFullYear() - 3);
      break;
    case '5y':
      result.setUTCFullYear(result.getUTCFullYear() - 5);
      break;
  }

  return result;
}

/**
 * `startDate`'ten `endDate`'e aylık adımlarla örnekleme tarihleri üretir; son
 * nokta her zaman `endDate`'e sabitlenir (ay sonu taşması gibi takvim
 * kaymalarını gidermek için). Grafik girdisinin çözünürlüğü budur — günlük
 * tüm `AssetPrice` kayıtları değil, dönem uzunluğuna göre aylık örnekler
 * (docs/03_API_CONTRACTS.md §5.2 örneğindeki ~1 aylık nokta aralığıyla tutarlı).
 */
function buildSampleDates(startDate: Date, endDate: Date, period: SeriesPeriod): Date[] {
  const totalMonths = PERIOD_MONTHS[period];
  const dates: Date[] = [];

  for (let i = 0; i <= totalMonths; i++) {
    const candidate = new Date(startDate);
    candidate.setUTCMonth(candidate.getUTCMonth() + i);
    dates.push(candidate.getTime() >= endDate.getTime() ? endDate : candidate);
  }

  return dates;
}

/**
 * Kaynak: docs/03_API_CONTRACTS.md §5.2 `GET /api/comparison/series`.
 *
 * 2–5 varlık kısıtı, ham istek sayısı yerine `findComparableAssets`'ten dönen
 * **çözülmüş** (DB'de bulunan, aktif) varlık sayısı üzerinden uygulanır —
 * bu endpoint'in dokümante edilmiş hata kodları arasında `ASSET_NOT_FOUND`
 * yoktur (yalnızca `VALIDATION_ERROR`, `INVALID_ASSET_SELECTION`,
 * `INVALID_PERIOD`, `INTERNAL_ERROR` — docs/03 §5.2), bu yüzden var olmayan
 * bir sembol de nihai olarak "grafik için yeterli varlık yok" durumuna
 * (`InvalidAssetSelectionError`) düşer.
 */
export async function getComparisonSeries(params: GetSeriesParams): Promise<SeriesResult> {
  const endDate = new Date();
  const startDate = subtractPeriod(endDate, params.period);

  const assets = await findComparableAssets({ symbols: params.symbols });

  if (assets.length < MIN_ASSETS || assets.length > MAX_ASSETS) {
    throw new InvalidAssetSelectionError(assets.length);
  }

  const sampleDates = buildSampleDates(startDate, endDate, params.period);

  const series = await Promise.all(
    assets.map((asset) => buildAssetSeries(asset.symbol, asset.id, sampleDates)),
  );

  return {
    period: params.period,
    series,
    hasCryptoAsset: assets.some((asset) => asset.assetClassCode === 'crypto'),
  };
}

async function buildAssetSeries(
  symbol: string,
  assetId: bigint,
  sampleDates: Date[],
): Promise<AssetSeries> {
  const pricePoints = await Promise.all(
    sampleDates.map(async (date) => {
      const row = await findNearestPriceOnOrBefore({ assetId, onOrBeforeDate: date });

      return {
        // Kayıt bulunamadıysa (docs/01_DOMAIN_MODEL.md §4 madde 3 — tahmini
        // üretilmez) örnekleme tarihi görünür kalır, fiyat `null` bırakılır;
        // `calculateNormalizedReturnSeries` bu noktayı `null` değerle taşır.
        asOfDate: row?.asOfDate ?? isoDate(date),
        price: row?.price ?? null,
      };
    }),
  );

  const normalized = calculateNormalizedReturnSeries(pricePoints);

  return {
    symbol,
    points: normalized.map((point) => ({
      date: point.asOfDate,
      // docs/03_API_CONTRACTS.md §5.2 örneği ("100.000000") sabit 6 basamaklı
      // ondalık bekler — `Decimal.toString()` sondaki sıfırları sildiğinden
      // `toFixed(6)` kullanılır (asset-price-repository.ts ile aynı desen).
      value: point.normalizedReturn === null ? null : point.normalizedReturn.toFixed(6),
    })),
  };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

import { prisma } from '@terazi/core';

// Repository katmanı — Prisma sorgularının tek bulunduğu yer, servise düz TS
// nesnesi döner, `Prisma.*GetPayload` tipini dışarı sızdırmaz
// (.claude/rules/10-backend-architecture.md).

export interface ComparableAssetRow {
  id: bigint;
  symbol: string;
  assetClassCode: string;
}

export interface FindComparableAssetsParams {
  /** Belirtilirse yalnızca bu sembollerdeki varlıklar döner (docs/03_API_CONTRACTS.md §5.2 `assets` parametresi). */
  symbols?: string[];
}

/**
 * Karşılaştırma tablosunun kaynak varlık listesi — `is_active=true`, opsiyonel
 * sembol filtresiyle (docs/01_DOMAIN_MODEL.md §4 madde 4). Fiyat sorgusu için
 * gereken `id`'yi de taşıdığından (`findActiveAssets`'ten farklı olarak)
 * `asset-repository.ts` yerine bu dosyada tutulur.
 * Kaynak: docs/03_API_CONTRACTS.md §5.2.
 */
export async function findComparableAssets(
  params: FindComparableAssetsParams = {},
): Promise<ComparableAssetRow[]> {
  const rows = await prisma.asset.findMany({
    where: {
      isActive: true,
      ...(params.symbols && params.symbols.length > 0 ? { symbol: { in: params.symbols } } : {}),
    },
    include: { assetClass: true },
    orderBy: [{ assetClass: { sortOrder: 'asc' } }, { symbol: 'asc' }],
  });

  return rows.map((row) => ({
    id: row.id,
    symbol: row.symbol,
    assetClassCode: row.assetClass.code,
  }));
}

export interface AssetPriceRow {
  /** ISO `YYYY-MM-DD`. */
  asOfDate: string;
  /** `NUMERIC(20,6)` — string olarak taşınır ([TS-006]). */
  price: string;
}

export interface FindNearestPriceParams {
  assetId: bigint;
  onOrBeforeDate: Date;
}

/**
 * Verilen tarihe kadar (dahil) en güncel `AssetPrice` kaydı. Dönem başı/sonu
 * takvim günü tam bir fiyat kaydına denk gelmeyebilir (hafta sonu/tatil,
 * TEFAS/TCMB yalnızca iş günü verisi üretir) — bu yüzden "üstünde değil, en
 * yakın" (onOrBefore) eşleşmesi kullanılır. Bu dönüşüm İterasyon 3'te
 * (`/api/comparison/series`) de aynı şekilde uygulanır (docs/10 §3.2 risk notu).
 *
 * `(asset_id, as_of_date DESC)` index bu sorguyu destekler
 * (docs/02_DATABASE_SCHEMA.md §2.3, §4). Kayıt yoksa `null` döner — tahmini
 * üretilmez (docs/01_DOMAIN_MODEL.md §4 madde 3).
 */
export async function findNearestPriceOnOrBefore(
  params: FindNearestPriceParams,
): Promise<AssetPriceRow | null> {
  const row = await prisma.assetPrice.findFirst({
    where: { assetId: params.assetId, asOfDate: { lte: params.onOrBeforeDate } },
    orderBy: { asOfDate: 'desc' },
  });

  if (!row) return null;

  return {
    asOfDate: row.asOfDate.toISOString().slice(0, 10),
    // `NUMERIC(20,6)` — `Decimal.toString()` sondaki sıfırları siler
    // ("34.82"); `toFixed(6)` şema hassasiyetini korur (docs/03 §5.2 örneği
    // "32.150000" gibi 6 basamaklı).
    price: row.price.toFixed(6),
  };
}

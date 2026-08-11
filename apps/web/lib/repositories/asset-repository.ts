import { prisma } from '@terazi/core';

// Repository katmanı — Prisma sorgularının tek bulunduğu yer, servise düz TS
// nesnesi döner, `Prisma.AssetGetPayload` tipini dışarı sızdırmaz
// (.claude/rules/10-backend-architecture.md).

export interface ActiveAssetRow {
  symbol: string;
  nameTr: string;
  assetClassCode: string;
}

export interface FindActiveAssetsParams {
  /** Belirtilirse yalnızca bu varlık sınıfındaki (`asset_classes.code`) varlıklar döner. */
  assetClass?: string;
}

/**
 * `is_active=true` aktif varlıkları, opsiyonel varlık sınıfı filtresiyle döner
 * (docs/02_DATABASE_SCHEMA.md §4 partial index — `is_active` üzerinden filtrelenir).
 * Kaynak: docs/03_API_CONTRACTS.md §5.1.
 */
export async function findActiveAssets(
  params: FindActiveAssetsParams = {},
): Promise<ActiveAssetRow[]> {
  const rows = await prisma.asset.findMany({
    where: {
      isActive: true,
      ...(params.assetClass ? { assetClass: { code: params.assetClass } } : {}),
    },
    include: { assetClass: true },
    orderBy: [{ assetClass: { sortOrder: 'asc' } }, { symbol: 'asc' }],
  });

  return rows.map((row) => ({
    symbol: row.symbol,
    nameTr: row.nameTr,
    assetClassCode: row.assetClass.code,
  }));
}

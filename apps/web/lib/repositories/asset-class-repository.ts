import { prisma } from '@terazi/core';

// Repository katmanı — Prisma sorgularının tek bulunduğu yer, servise düz TS
// nesnesi döner, `Prisma.AssetClassGetPayload` tipini dışarı sızdırmaz
// (.claude/rules/10-backend-architecture.md).

export interface AssetClassRow {
  code: string;
  nameTr: string;
  sortOrder: number;
}

/**
 * Tüm varlık sınıflarını `sort_order`'a göre sıralı döner.
 * Kaynak: docs/03_API_CONTRACTS.md §5.1, docs/02_DATABASE_SCHEMA.md §2.1.
 */
export async function findAllAssetClasses(): Promise<AssetClassRow[]> {
  const rows = await prisma.assetClass.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return rows.map((row) => ({
    code: row.code,
    nameTr: row.nameTr,
    sortOrder: row.sortOrder,
  }));
}

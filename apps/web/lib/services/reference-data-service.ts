import { findAllAssetClasses } from '../repositories/asset-class-repository.js';
import { findActiveAssets } from '../repositories/asset-repository.js';

// Servis katmanı — repository'yi çağırır, DB'nin `snake_case` alanlarını
// response `camelCase` alanlarına dönüştürür. Prisma client'a doğrudan
// erişmez, HTTP/route detayı bilmez (.claude/rules/10-backend-architecture.md).

export interface AssetClassDto {
  code: string;
  nameTr: string;
  sortOrder: number;
}

export interface AssetDto {
  symbol: string;
  nameTr: string;
  assetClass: string;
}

export interface GetAssetsParams {
  assetClass?: string;
}

/** Kaynak: docs/03_API_CONTRACTS.md §5.1 `GET /api/asset-classes` response `data`. */
export async function getAssetClasses(): Promise<AssetClassDto[]> {
  const rows = await findAllAssetClasses();

  return rows.map((row) => ({
    code: row.code,
    nameTr: row.nameTr,
    sortOrder: row.sortOrder,
  }));
}

/** Kaynak: docs/03_API_CONTRACTS.md §5.1 `GET /api/assets` response `data`. */
export async function getAssets(params: GetAssetsParams = {}): Promise<AssetDto[]> {
  const rows = await findActiveAssets({ assetClass: params.assetClass });

  return rows.map((row) => ({
    symbol: row.symbol,
    nameTr: row.nameTr,
    assetClass: row.assetClassCode,
  }));
}

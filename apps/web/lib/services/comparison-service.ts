import { Prisma } from '@prisma/client';
import { calculateNominalReturn, calculateRealReturn } from '@terazi/core';

import {
  findComparableAssets,
  findNearestPriceOnOrBefore,
} from '../repositories/asset-price-repository.js';
import { findNearestCpiOnOrBefore } from '../repositories/cpi-repository.js';

// Servis katmanı — repository'leri + `packages/core`'daki tek kaynak hesap
// fonksiyonlarını çağırır. Reel/nominal getiri burada yeniden implemente
// edilmez (docs/01_DOMAIN_MODEL.md §6 kuralı), yalnızca import edilir.
// Prisma client'a doğrudan erişmez (.claude/rules/10-backend-architecture.md).

export type ComparisonPeriod = '1m' | '3m' | '1y' | '3y' | '5y';
export type ComparisonSortBy = 'realReturn' | 'nominalReturn' | 'symbol';
export type ComparisonSortDir = 'asc' | 'desc';

export interface ComparisonRow {
  symbol: string;
  assetClass: string;
  status: 'ok' | 'unavailable';
  startPrice: string | null;
  endPrice: string | null;
  startDate: string | null;
  endDate: string | null;
  nominalReturn: string | null;
  realReturn: string | null;
  asOfDate: string | null;
}

export interface GetComparisonParams {
  /** Belirtilmezse tüm aktif varlıklar karşılaştırılır. */
  symbols?: string[];
  period: ComparisonPeriod;
  sortBy: ComparisonSortBy;
  sortDir: ComparisonSortDir;
}

export interface ComparisonResult {
  period: ComparisonPeriod;
  rows: ComparisonRow[];
}

/**
 * Dönem enum'unu takvim tarihine çevirir — bu dönüşüm İterasyon 3'te
 * (`/api/comparison/series`) de aynı şekilde kullanılacak tek kaynaktır
 * (docs/10_IMPLEMENTATION_ROADMAP.md §3.2 risk notu). Ay/yıl aritmetiği için
 * `Date` kullanılır — bu tarih hesabıdır, parasal bir alan değildir ([TS-006]
 * yalnızca fiyat/getiri alanlarını kapsar).
 */
function subtractPeriod(from: Date, period: ComparisonPeriod): Date {
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

/** `Date` → `'YYYY-MM'` (CpiIndex.period_month formatı). */
function toMonthString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const UNAVAILABLE_FIELDS = {
  status: 'unavailable' as const,
  startPrice: null,
  endPrice: null,
  startDate: null,
  endDate: null,
  nominalReturn: null,
  realReturn: null,
  asOfDate: null,
};

interface SortableRow {
  row: ComparisonRow;
  /** Sıralama için `Prisma.Decimal` — string'e ondalık kaybı olmadan karşılaştırma. */
  nominalReturn: Prisma.Decimal | null;
  realReturn: Prisma.Decimal | null;
}

/** Kaynak: docs/03_API_CONTRACTS.md §5.2 `GET /api/comparison`. */
export async function getComparison(params: GetComparisonParams): Promise<ComparisonResult> {
  // "Bugün" — worker verisi ne kadar güncelse (as_of_date) o kullanılır,
  // eksikse geriye doğru en yakın kayıt bulunur (graceful degradation,
  // docs/01_DOMAIN_MODEL.md §5).
  const endDate = new Date();
  const startDate = subtractPeriod(endDate, params.period);

  const assets = await findComparableAssets({ symbols: params.symbols });

  const [startCpi, endCpi] = await Promise.all([
    findNearestCpiOnOrBefore({ onOrBeforeMonth: toMonthString(startDate) }),
    findNearestCpiOnOrBefore({ onOrBeforeMonth: toMonthString(endDate) }),
  ]);

  const sortableRows = await Promise.all(
    assets.map((asset) => buildRow(asset, startDate, endDate, startCpi, endCpi)),
  );

  return {
    period: params.period,
    rows: sortRows(sortableRows, params.sortBy, params.sortDir),
  };
}

async function buildRow(
  asset: { id: bigint; symbol: string; assetClassCode: string },
  startDate: Date,
  endDate: Date,
  startCpi: Awaited<ReturnType<typeof findNearestCpiOnOrBefore>>,
  endCpi: Awaited<ReturnType<typeof findNearestCpiOnOrBefore>>,
): Promise<SortableRow> {
  const [startPrice, endPrice] = await Promise.all([
    findNearestPriceOnOrBefore({ assetId: asset.id, onOrBeforeDate: startDate }),
    findNearestPriceOnOrBefore({ assetId: asset.id, onOrBeforeDate: endDate }),
  ]);

  // Hesaplanabilirlik koşulu (docs/01_DOMAIN_MODEL.md §4 madde 3): dönemin
  // başlangıç/bitiş fiyatı VE ilgili TÜFE değerleri eksiksiz olmalı; eksikse
  // "unavailable" — sıfır veya tahmini değer üretilmez.
  if (!startPrice || !endPrice || !startCpi || !endCpi) {
    return {
      row: { symbol: asset.symbol, assetClass: asset.assetClassCode, ...UNAVAILABLE_FIELDS },
      nominalReturn: null,
      realReturn: null,
    };
  }

  const nominalReturn = calculateNominalReturn(startPrice.price, endPrice.price);
  const realReturn = calculateRealReturn({
    startPrice: startPrice.price,
    endPrice: endPrice.price,
    startCpi: startCpi.indexValue,
    endCpi: endCpi.indexValue,
  });

  if (nominalReturn === null || realReturn === null) {
    return {
      row: { symbol: asset.symbol, assetClass: asset.assetClassCode, ...UNAVAILABLE_FIELDS },
      nominalReturn: null,
      realReturn: null,
    };
  }

  return {
    row: {
      symbol: asset.symbol,
      assetClass: asset.assetClassCode,
      status: 'ok',
      startPrice: startPrice.price,
      endPrice: endPrice.price,
      startDate: startPrice.asOfDate,
      endDate: endPrice.asOfDate,
      // docs/03_API_CONTRACTS.md §5.2 örneği ("0.083047", "-0.021500") sabit
      // 6 basamaklı ondalık oran bekler — `Decimal.toString()` sondaki
      // sıfırları sildiğinden `toFixed(6)` kullanılır.
      nominalReturn: nominalReturn.toFixed(6),
      realReturn: realReturn.toFixed(6),
      asOfDate: endPrice.asOfDate,
    },
    nominalReturn,
    realReturn,
  };
}

/**
 * `unavailable` satırlar (sıralanacak sayısal değeri olmayan) yön fark
 * etmeksizin listenin sonuna itilir; kalanlar istenen alan/yönde sıralanır.
 */
function sortRows(
  rows: SortableRow[],
  sortBy: ComparisonSortBy,
  sortDir: ComparisonSortDir,
): ComparisonRow[] {
  const dir = sortDir === 'asc' ? 1 : -1;

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'symbol') {
      return dir * a.row.symbol.localeCompare(b.row.symbol);
    }

    const aValue = sortBy === 'realReturn' ? a.realReturn : a.nominalReturn;
    const bValue = sortBy === 'realReturn' ? b.realReturn : b.nominalReturn;

    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;

    return dir * aValue.comparedTo(bValue);
  });

  return sorted.map((entry) => entry.row);
}

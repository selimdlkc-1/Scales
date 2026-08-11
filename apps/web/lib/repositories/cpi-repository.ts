import { prisma } from '@terazi/core';

// Repository katmanı — Prisma sorgularının tek bulunduğu yer, servise düz TS
// nesnesi döner, `Prisma.CpiIndexGetPayload` tipini dışarı sızdırmaz
// (.claude/rules/10-backend-architecture.md).

export interface CpiIndexRow {
  /** `'YYYY-MM'` formatı. */
  periodMonth: string;
  /** `NUMERIC(12,4)` — string olarak taşınır ([TS-006]). */
  indexValue: string;
}

export interface FindNearestCpiParams {
  /** `'YYYY-MM'` formatında hedef ay. */
  onOrBeforeMonth: string;
}

/**
 * Verilen aya kadar (dahil) en güncel `CpiIndex` kaydı — TCMB TÜFE'yi ayın
 * belirli bir gününde yayımlar, dönem başı/sonu tarihinin ait olduğu ay için
 * kayıt bulunmayabilir. Bu yüzden "üstünde değil, en yakın" ay eşleşmesi
 * kullanılır (`period_month` sabit `'YYYY-MM'` genişlikte olduğundan string
 * karşılaştırması kronolojik sırayla örtüşür).
 * Kaynak: docs/01_DOMAIN_MODEL.md §6 `cpi_change` formülü, §4 madde 3
 * (hesaplanabilirlik koşulu — eksikse `null`, tahmini üretilmez).
 */
export async function findNearestCpiOnOrBefore(
  params: FindNearestCpiParams,
): Promise<CpiIndexRow | null> {
  const row = await prisma.cpiIndex.findFirst({
    where: { periodMonth: { lte: params.onOrBeforeMonth } },
    orderBy: { periodMonth: 'desc' },
  });

  if (!row) return null;

  return {
    periodMonth: row.periodMonth,
    // `NUMERIC(12,4)` — şema hassasiyetini korumak için `toFixed(4)`
    // kullanılır (bkz. asset-price-repository.ts aynı gerekçe).
    indexValue: row.indexValue.toFixed(4),
  };
}

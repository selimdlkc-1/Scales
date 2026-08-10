import { Prisma } from '@prisma/client';

/**
 * Fiyat/endeks alanlarını `Decimal`'e çevirebilecek girdi tipleri. Dış
 * kaynaktan gelen değerler `schemas/external/*.ts` tarafından zaten
 * decimal-string'e sabitlenmiştir ([TS-006]) — bu fonksiyonlar `Number`
 * aritmetiği yapmaz, yalnızca `Prisma.Decimal` (decimal.js) kullanır.
 */
export type DecimalInput = Prisma.Decimal | string | number;

/**
 * Nominal getiri: `(end_price / start_price) - 1`.
 * Kaynak: docs/01_DOMAIN_MODEL.md §6.
 *
 * Başlangıç/bitiş fiyatı eksik (`null`/`undefined`) veya başlangıç fiyatı
 * sıfırsa `null` döner — exception fırlatmaz, process çökmez
 * (docs/08_TESTING_STRATEGY.md §4, ilk deny senaryosu).
 */
export function calculateNominalReturn(
  startPrice: DecimalInput | null | undefined,
  endPrice: DecimalInput | null | undefined,
): Prisma.Decimal | null {
  if (startPrice === null || startPrice === undefined) return null;
  if (endPrice === null || endPrice === undefined) return null;

  const start = new Prisma.Decimal(startPrice);
  const end = new Prisma.Decimal(endPrice);

  if (start.isZero()) return null;

  return end.dividedBy(start).minus(1);
}

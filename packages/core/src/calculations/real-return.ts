import { Prisma } from '@prisma/client';
import { calculateNominalReturn, type DecimalInput } from './nominal-return.js';

/**
 * TÜFE değişimi: `(end_cpi / start_cpi) - 1`.
 * Kaynak: docs/01_DOMAIN_MODEL.md §6.
 *
 * Oran formülü nominal getiriyle özdeş olduğundan `calculateNominalReturn`'ün
 * bölme/guard mantığı burada yeniden kullanılır — eksik/sıfır başlangıç TÜFE
 * değerinde `null` döner, exception fırlatmaz.
 */
export function calculateCpiChange(
  startCpi: DecimalInput | null | undefined,
  endCpi: DecimalInput | null | undefined,
): Prisma.Decimal | null {
  return calculateNominalReturn(startCpi, endCpi);
}

export interface RealReturnInput {
  startPrice: DecimalInput | null | undefined;
  endPrice: DecimalInput | null | undefined;
  startCpi: DecimalInput | null | undefined;
  endCpi: DecimalInput | null | undefined;
}

/**
 * Reel getiri: `((1 + nominal_return) / (1 + cpi_change)) - 1`.
 * Kaynak: docs/01_DOMAIN_MODEL.md §6.
 *
 * Reel getiri hesaplanabilirlik koşulu (docs/01 §4 madde 3): dönemin
 * başlangıç/bitiş fiyatı VE ilgili TÜFE değerleri eksiksiz olmalı. Herhangi
 * biri eksikse (ya da payda sıfırsa) `null` döner — sıfır veya tahmini bir
 * değer üretilmez, exception fırlatılmaz (docs/08_TESTING_STRATEGY.md §4).
 */
export function calculateRealReturn(input: RealReturnInput): Prisma.Decimal | null {
  const nominalReturn = calculateNominalReturn(input.startPrice, input.endPrice);
  if (nominalReturn === null) return null;

  const cpiChange = calculateCpiChange(input.startCpi, input.endCpi);
  if (cpiChange === null) return null;

  const denominator = new Prisma.Decimal(1).plus(cpiChange);
  if (denominator.isZero()) return null;

  return new Prisma.Decimal(1).plus(nominalReturn).dividedBy(denominator).minus(1);
}

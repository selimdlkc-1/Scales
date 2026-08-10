import { Prisma } from '@prisma/client';
import type { DecimalInput } from './nominal-return.js';

/** Grafik girdisi için ham bir fiyat serisi noktası. */
export interface PricePoint {
  asOfDate: string;
  price: DecimalInput | null | undefined;
}

/** Normalize edilmiş getiri serisinin bir noktası. */
export interface NormalizedReturnPoint {
  asOfDate: string;
  normalizedReturn: Prisma.Decimal | null;
}

/**
 * Normalize edilmiş getiri serisi: dönem başını 100 kabul eden endeks.
 * `normalized_return[t] = (price[t] / price[period_start]) * 100`.
 * Kaynak: docs/01_DOMAIN_MODEL.md §6 (grafik girdisi).
 *
 * `prices` dizisinin **ilk elemanı** dönem başlangıcı kabul edilir (çağıran,
 * `as_of_date` sırasına göre sıralanmış bir dizi geçirmekle yükümlüdür).
 * Başlangıç fiyatı eksik veya sıfırsa normalize edilecek bir taban yoktur —
 * serideki tüm noktalar `null` döner. Aradaki bir noktanın fiyatı eksikse
 * yalnızca o nokta `null` olur, diğerleri etkilenmez. Hiçbir durumda
 * exception fırlatılmaz (docs/08_TESTING_STRATEGY.md §4).
 */
export function calculateNormalizedReturnSeries(prices: PricePoint[]): NormalizedReturnPoint[] {
  const periodStart = prices[0];
  if (periodStart === undefined) return [];

  const startPrice =
    periodStart.price === null || periodStart.price === undefined
      ? null
      : new Prisma.Decimal(periodStart.price);

  if (startPrice === null || startPrice.isZero()) {
    return prices.map((point) => ({ asOfDate: point.asOfDate, normalizedReturn: null }));
  }

  return prices.map((point) => {
    if (point.price === null || point.price === undefined) {
      return { asOfDate: point.asOfDate, normalizedReturn: null };
    }

    const price = new Prisma.Decimal(point.price);
    return { asOfDate: point.asOfDate, normalizedReturn: price.dividedBy(startPrice).times(100) };
  });
}

import { z } from 'zod';

/**
 * CoinGecko `/coins/{id}/market_chart` uç noktasının ham JSON yanıt zarfı
 * (`vs_currency=try`). `prices` dizisinin her elemanı `[unixMs, price]`
 * çiftidir. CoinGecko diğer iki kaynağa göre daha stabil/resmî bir API'dir
 * (docs/07_SECURITY_IMPLEMENTATION.md §1 threat model) — bu yüzden TEFAS'taki
 * gibi ayrı bir "zarf + tek tek kayıt" ayrımı gerekmez, tüm dizi tek seferde
 * doğrulanır.
 */
const pricePointSchema = z.tuple([
  z.number({ invalid_type_error: 'timestamp sayısal (unix ms) olmalı' }),
  z.number({ invalid_type_error: 'price sayısal olmalı' }).positive('price pozitif olmalıdır'),
]);

export const coingeckoMarketChartResponseSchema = z.object({
  prices: z.array(pricePointSchema).min(1, 'prices boş olamaz'),
});

export type CoingeckoMarketChartResponse = z.infer<typeof coingeckoMarketChartResponseSchema>;
export type CoingeckoPricePoint = z.infer<typeof pricePointSchema>;

/** CoinGecko unix ms timestamp'ini ISO `YYYY-MM-DD` forma çevirir. */
export function toIsoDate(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

/**
 * CoinGecko'nun döndürdüğü JSON `number` fiyatı kanonik decimal-string forma
 * çevirir. Bu, dış kaynaktan alınan float'ın DB'ye yazılmadan önce tek
 * seferlik, aritmetiksiz bir string'e sabitlendiği noktadır — sonraki hiçbir
 * hesaplama bu değer üzerinde `Number` aritmetiği yapmaz ([TS-006]).
 */
export function toDecimalPriceString(price: number): string {
  return price.toFixed(6);
}

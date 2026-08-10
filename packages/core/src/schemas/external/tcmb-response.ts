import { z } from 'zod';

/**
 * TCMB EVDS servisinin (evds2.tcmb.gov.tr) ham JSON yanıt zarfı.
 *
 * Her `item` bir güne karşılık gelir: `Tarih` (DD-MM-YYYY) + istenen seri
 * kodu(ları) kadar dinamik kolon (örn. `TP_DK_USD_A_YTL`). Seri kodu istek
 * anında belirlendiği için burada whitelist edilmez — job (Faz 2) hangi
 * kodu istediğini bilir ve `extractTcmbSeriesValue` ile okur.
 *
 * SEC-007: bu şema, worker DB'ye yazmadan önce her EVDS yanıtını doğrular.
 * Kaynak: docs/07_SECURITY_IMPLEMENTATION.md §6, docs/03_API_CONTRACTS.md.
 */
const tcmbEvdsItemSchema = z
  .object({
    Tarih: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'Tarih DD-MM-YYYY formatında olmalı'),
  })
  // Dinamik seri kolonları: değer varsa string, veri yoksa (tatil/eksik gün) null.
  .catchall(z.string().nullable());

export const tcmbEvdsResponseSchema = z.object({
  items: z.array(tcmbEvdsItemSchema).min(1, 'items boş olamaz'),
});

export type TcmbEvdsResponse = z.infer<typeof tcmbEvdsResponseSchema>;
export type TcmbEvdsItem = z.infer<typeof tcmbEvdsItemSchema>;

/**
 * Bir EVDS item'ından belirli bir seri kodunun değerini kanonik decimal-string
 * forma (nokta ondalık ayraç) çevirir. TCMB'nin virgüllü ondalık formatını
 * (`"32,8551"`) noktalı forma (`"32.8551"`) dönüştürür. Değer eksikse `null`
 * döner, exception fırlatmaz (docs/08_TESTING_STRATEGY.md §4).
 */
export function extractTcmbSeriesValue(item: TcmbEvdsItem, seriesCode: string): string | null {
  const raw = item[seriesCode];
  if (raw == null) return null;
  return raw.trim().replace(',', '.');
}

/** EVDS `DD-MM-YYYY` tarihini ISO `YYYY-MM-DD` forma çevirir. */
export function toIsoDate(evdsDate: string): string {
  const [day, month, year] = evdsDate.split('-');
  return `${year}-${month}-${day}`;
}

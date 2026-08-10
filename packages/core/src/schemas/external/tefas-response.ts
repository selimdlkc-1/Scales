import { z } from 'zod';

/**
 * TEFAS `BindHistoryInfo` uç noktasının ham JSON yanıt zarfı.
 *
 * TEFAS resmî olmayan, kırılgan bir kaynaktır (docs/07_SECURITY_IMPLEMENTATION.md
 * §1 threat model) — bu yüzden zarf ve kayıt doğrulaması iki ayrı şemaya
 * bölünür: `tefasResponseSchema` yalnızca zarfın (`data` dizisi) varlığını
 * doğrular, her kayıt worker job'unda `tefasFundRecordSchema` ile tek tek
 * `safeParse` edilir — böylece bozuk bir fon kaydı tüm çalıştırmayı
 * düşürmez, yalnızca o kayıt atlanır ve `JobRun.status='partial'` olur
 * (docs/01_DOMAIN_MODEL.md §5).
 */
export const tefasResponseSchema = z.object({
  data: z.array(z.unknown(), { invalid_type_error: 'data bir dizi olmalıdır' }),
});

export type TefasResponse = z.infer<typeof tefasResponseSchema>;

/**
 * TEFAS'ın tek bir fon/gün kaydı. `TARIH` .NET JSON tarih formatındadır
 * (`/Date(1699999999000)/`), `FIYAT` ya number ya da ondalık string olarak
 * gelebilir — her ikisi de kabul edilir, `toDecimalPriceString` ile kanonik
 * decimal-string forma çevrilir.
 */
export const tefasFundRecordSchema = z.object({
  TARIH: z.string().regex(/^\/Date\(\d+\)\/$/, '.NET Date formatı bekleniyor (/Date(ms)/)'),
  FONKODU: z.string().min(1, 'FONKODU boş olamaz').max(10),
  FIYAT: z.union([
    z.number().positive('FIYAT pozitif olmalıdır'),
    z.string().regex(/^\d+(\.\d+)?$/, 'FIYAT ondalık sayı formatında olmalı'),
  ]),
});

export type TefasFundRecord = z.infer<typeof tefasFundRecordSchema>;

/** TEFAS `/Date(ms)/` tarihini ISO `YYYY-MM-DD` forma çevirir. */
export function toIsoDate(dotNetDate: string): string {
  const millis = Number(dotNetDate.slice('/Date('.length, -'/)'.length));
  const isoString = new Date(millis).toISOString();
  return isoString.slice(0, 10);
}

/** TEFAS `FIYAT` değerini (number | decimal-string) kanonik decimal-string forma çevirir. */
export function toDecimalPriceString(fiyat: TefasFundRecord['FIYAT']): string {
  return typeof fiyat === 'number' ? fiyat.toFixed(6) : fiyat;
}

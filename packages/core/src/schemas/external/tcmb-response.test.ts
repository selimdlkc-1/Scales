import { describe, expect, it } from 'vitest';
import { extractTcmbSeriesValue, tcmbEvdsResponseSchema, toIsoDate } from './tcmb-response.js';

describe('tcmbEvdsResponseSchema', () => {
  it('geçerli EVDS yanıtını doğrular (dinamik seri kolonu dahil)', () => {
    const raw = {
      items: [
        { Tarih: '01-08-2025', TP_DK_USD_A_YTL: '32,8551' },
        { Tarih: '04-08-2025', TP_DK_USD_A_YTL: null },
      ],
    };

    const result = tcmbEvdsResponseSchema.safeParse(raw);

    expect(result.success).toBe(true);
  });

  it('items eksikse reddeder', () => {
    const result = tcmbEvdsResponseSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('items boş diziyse reddeder', () => {
    const result = tcmbEvdsResponseSchema.safeParse({ items: [] });

    expect(result.success).toBe(false);
  });

  it('Tarih alanı eksikse reddeder', () => {
    const result = tcmbEvdsResponseSchema.safeParse({
      items: [{ TP_DK_USD_A_YTL: '32,8551' }],
    });

    expect(result.success).toBe(false);
  });

  it('Tarih formatı beklenmedik tipteyse (ISO string, DD-MM-YYYY değil) reddeder', () => {
    const result = tcmbEvdsResponseSchema.safeParse({
      items: [{ Tarih: '2025-08-01', TP_DK_USD_A_YTL: '32,8551' }],
    });

    expect(result.success).toBe(false);
  });

  it('seri kolonu beklenmeyen tipteyse (number) reddeder', () => {
    const result = tcmbEvdsResponseSchema.safeParse({
      items: [{ Tarih: '01-08-2025', TP_DK_USD_A_YTL: 32.8551 }],
    });

    expect(result.success).toBe(false);
  });
});

describe('extractTcmbSeriesValue', () => {
  it('virgüllü ondalık değeri noktalı decimal-string forma çevirir', () => {
    const item = { Tarih: '01-08-2025', TP_DK_USD_A_YTL: '32,8551' };

    expect(extractTcmbSeriesValue(item, 'TP_DK_USD_A_YTL')).toBe('32.8551');
  });

  it('değer eksikse (tatil/veri yok) null döner, exception fırlatmaz', () => {
    const item = { Tarih: '04-08-2025', TP_DK_USD_A_YTL: null };

    expect(extractTcmbSeriesValue(item, 'TP_DK_USD_A_YTL')).toBeNull();
  });

  it('bilinmeyen seri kodu için null döner', () => {
    const item = { Tarih: '01-08-2025', TP_DK_USD_A_YTL: '32,8551' };

    expect(extractTcmbSeriesValue(item, 'TP_FG_J0')).toBeNull();
  });
});

describe('toIsoDate (tcmb)', () => {
  it('DD-MM-YYYY tarihini ISO YYYY-MM-DD forma çevirir', () => {
    expect(toIsoDate('01-08-2025')).toBe('2025-08-01');
  });
});

import { describe, expect, it } from 'vitest';
import {
  tefasFundRecordSchema,
  tefasResponseSchema,
  toDecimalPriceString,
  toIsoDate,
} from './tefas-response.js';

describe('tefasResponseSchema', () => {
  it('geçerli zarfı (data dizisi) doğrular', () => {
    const result = tefasResponseSchema.safeParse({
      data: [{ TARIH: '/Date(1699999999000)/', FONKODU: 'AFA', FIYAT: 1.234567 }],
    });

    expect(result.success).toBe(true);
  });

  it('data alanı eksikse reddeder', () => {
    const result = tefasResponseSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('data dizi değilse (beklenmeyen tip) reddeder', () => {
    const result = tefasResponseSchema.safeParse({ data: 'beklenmedik-string' });

    expect(result.success).toBe(false);
  });
});

describe('tefasFundRecordSchema', () => {
  it('geçerli bir fon kaydını (number FIYAT) doğrular', () => {
    const result = tefasFundRecordSchema.safeParse({
      TARIH: '/Date(1699999999000)/',
      FONKODU: 'AFA',
      FIYAT: 1.234567,
    });

    expect(result.success).toBe(true);
  });

  it('geçerli bir fon kaydını (string FIYAT) doğrular', () => {
    const result = tefasFundRecordSchema.safeParse({
      TARIH: '/Date(1699999999000)/',
      FONKODU: 'AFA',
      FIYAT: '1.234567',
    });

    expect(result.success).toBe(true);
  });

  it('bozuk veri: FONKODU eksikse kaydı reddeder', () => {
    const result = tefasFundRecordSchema.safeParse({
      TARIH: '/Date(1699999999000)/',
      FIYAT: 1.234567,
    });

    expect(result.success).toBe(false);
  });

  it('bozuk veri: TARIH beklenmeyen formatta ise (.NET Date sarmalayıcısı yok) reddeder', () => {
    const result = tefasFundRecordSchema.safeParse({
      TARIH: '2023-11-14',
      FONKODU: 'AFA',
      FIYAT: 1.234567,
    });

    expect(result.success).toBe(false);
  });

  it('bozuk veri: FIYAT negatifse reddeder', () => {
    const result = tefasFundRecordSchema.safeParse({
      TARIH: '/Date(1699999999000)/',
      FONKODU: 'AFA',
      FIYAT: -1,
    });

    expect(result.success).toBe(false);
  });

  it('bozuk veri: FIYAT beklenmeyen tipte (boolean) ise reddeder', () => {
    const result = tefasFundRecordSchema.safeParse({
      TARIH: '/Date(1699999999000)/',
      FONKODU: 'AFA',
      FIYAT: true,
    });

    expect(result.success).toBe(false);
  });
});

describe('toIsoDate (tefas)', () => {
  it('.NET Date formatını ISO YYYY-MM-DD forma çevirir', () => {
    expect(toIsoDate('/Date(1699999999000)/')).toBe('2023-11-14');
  });
});

describe('toDecimalPriceString (tefas)', () => {
  it('number FIYAT değerini 6 ondalıklı decimal-string forma çevirir', () => {
    expect(toDecimalPriceString(1.2)).toBe('1.200000');
  });

  it('string FIYAT değerini olduğu gibi geçirir', () => {
    expect(toDecimalPriceString('1.234567')).toBe('1.234567');
  });
});

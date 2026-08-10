import { describe, expect, it } from 'vitest';
import { calculateNominalReturn } from './nominal-return.js';

describe('calculateNominalReturn', () => {
  it('bilinen fiyat çifti için doğru nominal getiriyi hesaplar', () => {
    const result = calculateNominalReturn('100', '120');

    expect(result?.toString()).toBe('0.2');
  });

  it('ondalık hassasiyeti korur (float aritmetiğiyle kaybolacak bir bölme)', () => {
    // JS float ile 0.3 / 0.1 - 1 === 1.9999999999999998 döner (0.1+0.2
    // problemiyle aynı sınıf hata). Decimal aritmetiğinde tam olarak 2'dir.
    const result = calculateNominalReturn('0.1', '0.3');

    expect(result?.toString()).toBe('2');
  });

  it('sıfır başlangıç fiyatında null döner (exception fırlatmaz)', () => {
    const result = calculateNominalReturn('0', '100');

    expect(result).toBeNull();
  });

  it('eksik (undefined) başlangıç fiyatında null döner', () => {
    const result = calculateNominalReturn(undefined, '100');

    expect(result).toBeNull();
  });

  it('eksik (null) bitiş fiyatında null döner', () => {
    const result = calculateNominalReturn('100', null);

    expect(result).toBeNull();
  });

  it('negatif getiriyi doğru hesaplar', () => {
    const result = calculateNominalReturn('200', '150');

    expect(result?.toString()).toBe('-0.25');
  });
});

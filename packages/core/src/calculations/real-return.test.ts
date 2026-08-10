import { describe, expect, it } from 'vitest';
import { calculateCpiChange, calculateRealReturn } from './real-return.js';

describe('calculateCpiChange', () => {
  it('bilinen TÜFE çifti için doğru değişimi hesaplar', () => {
    const result = calculateCpiChange('1000', '1100');

    expect(result?.toString()).toBe('0.1');
  });

  it('eksik başlangıç TÜFE değerinde null döner', () => {
    const result = calculateCpiChange(undefined, '1100');

    expect(result).toBeNull();
  });
});

describe('calculateRealReturn', () => {
  it('bilinen fiyat/TÜFE çifti için elle hesaplanmış reel getiriyi üretir', () => {
    // nominal = 120/100 - 1 = 0.2 ; cpi_change = 1100/1000 - 1 = 0.1
    // real = (1.2 / 1.1) - 1 = 1/11 = 0.090909...
    const result = calculateRealReturn({
      startPrice: '100',
      endPrice: '120',
      startCpi: '1000',
      endCpi: '1100',
    });

    expect(result?.toFixed(4)).toBe('0.0909');
  });

  it('ondalık hassasiyeti korur (float ile kaybolacak bileşik bölme)', () => {
    // nominal = 0.3/0.1 - 1 = 2 (tam) ; cpi_change = 0.2/0.1 - 1 = 1 (tam)
    // real = (1+2)/(1+1) - 1 = 3/2 - 1 = 0.5 (tam)
    const result = calculateRealReturn({
      startPrice: '0.1',
      endPrice: '0.3',
      startCpi: '0.1',
      endCpi: '0.2',
    });

    expect(result?.toString()).toBe('0.5');
  });

  it('eksik başlangıç fiyatında null döner (exception fırlatmaz)', () => {
    const result = calculateRealReturn({
      startPrice: undefined,
      endPrice: '120',
      startCpi: '1000',
      endCpi: '1100',
    });

    expect(result).toBeNull();
  });

  it('eksik TÜFE verisinde null döner', () => {
    const result = calculateRealReturn({
      startPrice: '100',
      endPrice: '120',
      startCpi: undefined,
      endCpi: '1100',
    });

    expect(result).toBeNull();
  });

  it('cpi_change tam -1 olup payda sıfırlandığında null döner', () => {
    // cpi_change = 0/100 - 1 = -1 → denominator = 1 + (-1) = 0
    const result = calculateRealReturn({
      startPrice: '100',
      endPrice: '120',
      startCpi: '100',
      endCpi: '0',
    });

    expect(result).toBeNull();
  });
});

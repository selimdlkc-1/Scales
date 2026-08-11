import { describe, expect, it } from 'vitest';
import {
  AssetNotFoundError,
  InvalidAssetSelectionError,
  TeraziError,
  UnauthorizedError,
  ValidationError,
} from './errors.js';

describe('ValidationError', () => {
  it('code/httpStatus sabitlerini taşır, TeraziError alt sınıfıdır', () => {
    const error = new ValidationError('Geçersiz sorgu parametresi.', {
      field: 'period',
      received: '10y',
    });

    expect(error).toBeInstanceOf(TeraziError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Geçersiz sorgu parametresi.');
    expect(error.details).toEqual({ field: 'period', received: '10y' });
    expect(error.name).toBe('ValidationError');
  });

  it('details opsiyoneldir', () => {
    const error = new ValidationError('mesaj');

    expect(error.details).toBeUndefined();
  });
});

describe('AssetNotFoundError', () => {
  it("symbol'ü mesaja ve details'e gömer", () => {
    const error = new AssetNotFoundError('XAUTRY');

    expect(error.code).toBe('ASSET_NOT_FOUND');
    expect(error.httpStatus).toBe(404);
    expect(error.message).toContain('XAUTRY');
    expect(error.details).toEqual({ symbol: 'XAUTRY' });
  });
});

describe('InvalidAssetSelectionError', () => {
  it("count'u details'e gömer", () => {
    const error = new InvalidAssetSelectionError(6);

    expect(error.code).toBe('INVALID_ASSET_SELECTION');
    expect(error.httpStatus).toBe(400);
    expect(error.details).toEqual({ count: 6 });
  });

  it('1 varlık için de aynı şekilde çalışır', () => {
    const error = new InvalidAssetSelectionError(1);

    expect(error.details).toEqual({ count: 1 });
  });
});

describe('UnauthorizedError', () => {
  it('details taşımaz, sabit mesaj döner', () => {
    const error = new UnauthorizedError();

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.httpStatus).toBe(401);
    expect(error.details).toBeUndefined();
    expect(error.message).toBe('Kimlik doğrulama başarısız.');
  });
});

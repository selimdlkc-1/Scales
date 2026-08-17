import { describe, expect, it } from 'vitest';

import { buildErrorBody, buildMeta, generateRequestId } from './response-envelope.js';

describe('generateRequestId', () => {
  it('8 karakterlik hex kimlik üretir', () => {
    expect(generateRequestId()).toMatch(/^[a-f0-9]{8}$/);
  });

  it('her çağrıda farklı bir değer üretir', () => {
    expect(generateRequestId()).not.toBe(generateRequestId());
  });
});

describe('buildMeta', () => {
  it('requestId + ISO 8601 generatedAt döner', () => {
    const meta = buildMeta();

    expect(meta.requestId).toMatch(/^[a-f0-9]{8}$/);
    expect(() => new Date(meta.generatedAt).toISOString()).not.toThrow();
  });
});

describe('buildErrorBody', () => {
  it('details verilmezse error.details alanı hiç eklenmez', () => {
    const body = buildErrorBody('INTERNAL_ERROR', 'Beklenmeyen bir hata oluştu.');

    expect(body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Beklenmeyen bir hata oluştu.' });
    expect('details' in body.error).toBe(false);
    expect(body.meta.requestId).toEqual(expect.any(String));
  });

  it('details verilirse aynen taşınır', () => {
    const body = buildErrorBody('VALIDATION_ERROR', 'Geçersiz sorgu parametresi.', {
      field: 'period',
      received: '10y',
    });

    expect(body.error.details).toEqual({ field: 'period', received: '10y' });
  });
});

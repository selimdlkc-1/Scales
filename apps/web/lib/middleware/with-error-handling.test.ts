import { AssetNotFoundError, InvalidAssetSelectionError, UnauthorizedError } from '@terazi/core';
import { NextRequest, NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { withErrorHandling } from './with-error-handling.js';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/assets');
}

describe('withErrorHandling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handler başarılı dönerse yanıtı olduğu gibi geçirir', async () => {
    const handler = vi.fn(async (_request: NextRequest) => NextResponse.json({ data: ['ok'] }));
    const wrapped = withErrorHandling(handler);

    const response = await wrapped(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: ['ok'] });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['AssetNotFoundError', new AssetNotFoundError('XAUTRY'), 404, 'ASSET_NOT_FOUND'],
    [
      'InvalidAssetSelectionError',
      new InvalidAssetSelectionError(1),
      400,
      'INVALID_ASSET_SELECTION',
    ],
    ['UnauthorizedError', new UnauthorizedError(), 401, 'UNAUTHORIZED'],
  ])(
    '%s fırlatılırsa kendi code/httpStatus çevrimini üretir',
    async (_name, error, status, code) => {
      const handler = vi.fn(async (_request: NextRequest): Promise<NextResponse> => {
        throw error;
      });
      const wrapped = withErrorHandling(handler);

      const response = await wrapped(makeRequest());

      expect(response.status).toBe(status);
      const body = (await response.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe(code);
      expect(body.error.message).toBe(error.message);
    },
  );

  it('domain exception dışındaki hatada 500 INTERNAL_ERROR jenerik mesaj döner, orijinal mesaj sızmaz', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = vi.fn(async (_request: NextRequest): Promise<NextResponse> => {
      throw new Error('gizli iç detay: connection string sızıntısı');
    });
    const wrapped = withErrorHandling(handler);

    const response = await wrapped(makeRequest());

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Beklenmeyen bir hata oluştu.');
    expect(body.error.message).not.toContain('connection string');
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('her yanıt meta.requestId taşır', async () => {
    const handler = vi.fn(async (_request: NextRequest): Promise<NextResponse> => {
      throw new UnauthorizedError();
    });
    const wrapped = withErrorHandling(handler);

    const response = await wrapped(makeRequest());
    const body = (await response.json()) as { meta: { requestId: string } };

    expect(body.meta.requestId).toMatch(/^[a-f0-9]{8}$/);
  });
});

import { comparisonQuerySchema, type ComparisonQuery } from '@terazi/core';
import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { withValidation } from './with-validation.js';

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/comparison?${query}`);
}

describe('withValidation', () => {
  it("şema geçerse doğrulanmış query handler'a ikinci parametre olarak geçirilir", async () => {
    const handler = vi.fn(async (_request: NextRequest, query: ComparisonQuery) =>
      NextResponse.json({ data: query }),
    );
    const wrapped = withValidation(comparisonQuerySchema, handler);

    const response = await wrapped(makeRequest('period=1y&assets=USDTRY'));

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        period: '1y',
        assets: 'USDTRY',
        sortBy: 'realReturn',
        sortDir: 'desc',
      }),
    );
  });

  it('period geçersizse 400 INVALID_PERIOD döner, handler çağrılmaz', async () => {
    const handler = vi.fn(async () => NextResponse.json({ data: 'unreachable' }));
    const wrapped = withValidation(comparisonQuerySchema, handler);

    const response = await wrapped(makeRequest('period=10y&assets=USDTRY'));

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { code: string; details: { field: string; received: string } };
    };
    expect(body.error.code).toBe('INVALID_PERIOD');
    expect(body.error.details).toEqual({ field: 'period', received: '10y' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('period eksikse de 400 INVALID_PERIOD döner', async () => {
    const wrapped = withValidation(comparisonQuerySchema, async () =>
      NextResponse.json({ data: 'unreachable' }),
    );

    const response = await wrapped(makeRequest('assets=USDTRY'));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_PERIOD');
  });

  it('period dışındaki alan hatasında 400 VALIDATION_ERROR döner', async () => {
    const wrapped = withValidation(comparisonQuerySchema, async () =>
      NextResponse.json({ data: 'unreachable' }),
    );

    const response = await wrapped(makeRequest('period=1y&sortBy=priceChange'));

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { code: string; details: { field: string; received: string } };
    };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual({ field: 'sortBy', received: 'priceChange' });
  });

  it('hata yanıtı meta.requestId taşır', async () => {
    const wrapped = withValidation(comparisonQuerySchema, async () =>
      NextResponse.json({ data: 'unreachable' }),
    );

    const response = await wrapped(makeRequest('period=10y'));
    const body = (await response.json()) as { meta: { requestId: string } };

    expect(body.meta.requestId).toMatch(/^[a-f0-9]{8}$/);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ComparisonFetchError, fetchComparison } from './comparison-fetcher';

const OK_BODY = {
  data: { period: '1y', rows: [] },
  meta: { requestId: 'abc12345', generatedAt: '2026-08-10T12:00:00Z' },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchComparison', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('requests /api/comparison with period/sortBy/sortDir query params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(OK_BODY));

    await fetchComparison({ period: '1y', sortBy: 'realReturn', sortDir: 'desc' });

    expect(fetch).toHaveBeenCalledWith('/api/comparison?period=1y&sortBy=realReturn&sortDir=desc');
  });

  it('includes assets= when symbols are given', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(OK_BODY));

    await fetchComparison({
      period: '1m',
      sortBy: 'symbol',
      sortDir: 'asc',
      symbols: ['USDTRY', 'BTC'],
    });

    const calledUrl = vi.mocked(fetch).mock.calls[0]?.[0];
    expect(calledUrl).toContain('assets=USDTRY%2CBTC');
  });

  it('returns data.rows on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(OK_BODY));

    const result = await fetchComparison({ period: '1y', sortBy: 'realReturn', sortDir: 'desc' });

    expect(result).toEqual(OK_BODY.data);
  });

  it('does not retry on a 400 VALIDATION_ERROR and throws the Turkish message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz dönem değeri.' } }, 400),
    );

    await expect(
      fetchComparison({ period: '1y', sortBy: 'realReturn', sortDir: 'desc' }),
    ).rejects.toThrow('Geçersiz dönem değeri.');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries once on a 500 and succeeds on the second attempt', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'sunucu hatası' } }, 500))
      .mockResolvedValueOnce(jsonResponse(OK_BODY));

    const promise = fetchComparison({ period: '1y', sortBy: 'realReturn', sortDir: 'desc' });
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toEqual(OK_BODY.data);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries once on a network error and throws the generic message if it fails again', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockRejectedValue(new TypeError('network down'));

    const promise = fetchComparison({ period: '1y', sortBy: 'realReturn', sortDir: 'desc' });
    const expectation = expect(promise).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(1000);
    await expectation;

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('exposes the HTTP status on ComparisonFetchError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: { code: 'INVALID_PERIOD', message: 'Geçersiz dönem değeri.' } }, 400),
    );

    try {
      await fetchComparison({ period: '1y', sortBy: 'realReturn', sortDir: 'desc' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ComparisonFetchError);
      expect((error as ComparisonFetchError).status).toBe(400);
    }
  });
});

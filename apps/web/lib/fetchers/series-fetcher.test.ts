import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SeriesFetchError, fetchSeries } from './series-fetcher';

const OK_BODY = {
  data: {
    period: '1y',
    series: [
      {
        symbol: 'USDTRY',
        points: [
          { date: '2025-08-10', value: '100.000000' },
          { date: '2026-08-10', value: '108.304700' },
        ],
      },
    ],
  },
  meta: { requestId: 'abc12345', generatedAt: '2026-08-10T12:00:00Z' },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchSeries', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('requests /api/comparison/series with period and comma-joined assets', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(OK_BODY));

    await fetchSeries({ period: '1y', symbols: ['USDTRY', 'BTC'] });

    expect(fetch).toHaveBeenCalledWith('/api/comparison/series?period=1y&assets=USDTRY%2CBTC');
  });

  it('returns data.series on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(OK_BODY));

    const result = await fetchSeries({ period: '1y', symbols: ['USDTRY'] });

    expect(result).toEqual(OK_BODY.data);
  });

  it('does not retry on a 400 INVALID_ASSET_SELECTION and throws the Turkish message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 'INVALID_ASSET_SELECTION',
            message: 'Grafik için 2 ile 5 arası varlık seçilmelidir.',
          },
        },
        400,
      ),
    );

    await expect(fetchSeries({ period: '1y', symbols: ['USDTRY'] })).rejects.toThrow(
      'Grafik için 2 ile 5 arası varlık seçilmelidir.',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries once on a 500 and succeeds on the second attempt', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'sunucu hatası' } }, 500))
      .mockResolvedValueOnce(jsonResponse(OK_BODY));

    const promise = fetchSeries({ period: '1y', symbols: ['USDTRY', 'BTC'] });
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toEqual(OK_BODY.data);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries once on a network error and throws the generic message if it fails again', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockRejectedValue(new TypeError('network down'));

    const promise = fetchSeries({ period: '1y', symbols: ['USDTRY', 'BTC'] });
    const expectation = expect(promise).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(1000);
    await expectation;

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('exposes the HTTP status on SeriesFetchError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: { code: 'INVALID_PERIOD', message: 'Geçersiz dönem değeri.' } }, 400),
    );

    try {
      await fetchSeries({ period: '1y', symbols: ['USDTRY', 'BTC'] });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(SeriesFetchError);
      expect((error as SeriesFetchError).status).toBe(400);
    }
  });
});

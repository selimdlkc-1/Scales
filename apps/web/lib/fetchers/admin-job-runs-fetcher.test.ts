import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminFetchError, fetchJobRuns } from './admin-job-runs-fetcher';

const OK_BODY = {
  data: [
    {
      id: 1042,
      dataSource: 'tefas',
      status: 'partial',
      startedAt: '2026-08-10T15:30:02Z',
      finishedAt: '2026-08-10T15:31:47Z',
      recordsUpserted: 58,
      errorMessage: '2 kayıt şema doğrulamasından geçemedi',
    },
  ],
  meta: { requestId: 'abc12345', generatedAt: '2026-08-10T12:00:00Z' },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchJobRuns', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('requests /api/admin/job-runs without a query string when dataSource is omitted ("Tümü")', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(OK_BODY));

    await fetchJobRuns({});

    expect(fetch).toHaveBeenCalledWith('/api/admin/job-runs');
  });

  it('includes dataSource= when a source filter is given', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(OK_BODY));

    await fetchJobRuns({ dataSource: 'tefas' });

    expect(fetch).toHaveBeenCalledWith('/api/admin/job-runs?dataSource=tefas');
  });

  it('returns data on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(OK_BODY));

    const result = await fetchJobRuns({ dataSource: 'tefas' });

    expect(result).toEqual(OK_BODY.data);
  });

  it('does not retry on a 401 UNAUTHORIZED and throws the Turkish message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Kimlik doğrulama gerekli.' } }, 401),
    );

    await expect(fetchJobRuns({})).rejects.toThrow('Kimlik doğrulama gerekli.');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries once on a 500 and succeeds on the second attempt', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'sunucu hatası' } }, 500))
      .mockResolvedValueOnce(jsonResponse(OK_BODY));

    const promise = fetchJobRuns({});
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toEqual(OK_BODY.data);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries once on a network error and throws the generic message if it fails again', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockRejectedValue(new TypeError('network down'));

    const promise = fetchJobRuns({});
    const expectation = expect(promise).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(1000);
    await expectation;

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('exposes the HTTP status on AdminFetchError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Kimlik doğrulama gerekli.' } }, 401),
    );

    try {
      await fetchJobRuns({});
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AdminFetchError);
      expect((error as AdminFetchError).status).toBe(401);
    }
  });
});

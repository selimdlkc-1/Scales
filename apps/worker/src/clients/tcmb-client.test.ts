// Unit test — global `fetch` mocklanır, gerçek TCMB EVDS API'sine gidilmez
// (.claude/rules/35-testing.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTcmbSeries } from './tcmb-client.js';

describe('fetchTcmbSeries', () => {
  const originalApiKey = process.env.TCMB_EVDS_API_KEY;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.TCMB_EVDS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env.TCMB_EVDS_API_KEY = originalApiKey;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('TCMB_EVDS_API_KEY tanımlı değilse fetch atmadan hata fırlatır', async () => {
    delete process.env.TCMB_EVDS_API_KEY;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(
      fetchTcmbSeries({
        seriesCodes: ['TP.DK.USD.A.YTL'],
        startDate: new Date('2025-08-01T00:00:00Z'),
        endDate: new Date('2025-08-07T00:00:00Z'),
      }),
    ).rejects.toThrow('TCMB_EVDS_API_KEY');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('seri kodlarını "-" ile birleştirip DD-MM-YYYY tarih aralığıyla doğru URL oluşturur', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await fetchTcmbSeries({
      seriesCodes: ['TP.DK.USD.A.YTL', 'TP.DK.EUR.A.YTL'],
      startDate: new Date('2025-08-01T00:00:00Z'),
      endDate: new Date('2025-08-07T00:00:00Z'),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestedUrl = fetchSpy.mock.calls[0]?.[0] as URL;
    expect(requestedUrl.searchParams.get('series')).toBe('TP.DK.USD.A.YTL-TP.DK.EUR.A.YTL');
    expect(requestedUrl.searchParams.get('startDate')).toBe('01-08-2025');
    expect(requestedUrl.searchParams.get('endDate')).toBe('07-08-2025');
    expect(requestedUrl.searchParams.get('type')).toBe('json');
    expect(requestedUrl.searchParams.get('key')).toBe('test-api-key');
  });

  it('başarılı yanıtta ham (doğrulanmamış) JSON döner', async () => {
    const rawBody = { items: [{ Tarih: '01-08-2025', TP_DK_USD_A_YTL: '32,85' }] };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rawBody),
    }) as unknown as typeof fetch;

    const result = await fetchTcmbSeries({
      seriesCodes: ['TP.DK.USD.A.YTL'],
      startDate: new Date('2025-08-01T00:00:00Z'),
      endDate: new Date('2025-08-07T00:00:00Z'),
    });

    expect(result).toEqual(rawBody);
  });

  it('HTTP hata kodu dönerse (5xx) exception fırlatır — job seviyesi retry bunu yakalar', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;

    await expect(
      fetchTcmbSeries({
        seriesCodes: ['TP.DK.USD.A.YTL'],
        startDate: new Date('2025-08-01T00:00:00Z'),
        endDate: new Date('2025-08-07T00:00:00Z'),
      }),
    ).rejects.toThrow('HTTP 503');
  });
});

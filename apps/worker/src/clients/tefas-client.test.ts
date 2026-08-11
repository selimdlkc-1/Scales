// Unit test — global `fetch` mocklanır, gerçek TEFAS endpoint'ine asla gidilmez
// (.claude/rules/35-testing.md).
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchTefasHistory } from './tefas-client.js';

describe('fetchTefasHistory', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('DD.MM.YYYY tarih aralığıyla POST isteği oluşturur, fonkod boş bırakılır', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await fetchTefasHistory({
      startDate: new Date('2025-08-01T00:00:00Z'),
      endDate: new Date('2025-08-07T00:00:00Z'),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://www.tefas.gov.tr/api/DB/BindHistoryInfo');
    expect(init.method).toBe('POST');

    const body = init.body as URLSearchParams;
    expect(body.get('bastarih')).toBe('01.08.2025');
    expect(body.get('bittarih')).toBe('07.08.2025');
    expect(body.get('fonkod')).toBe('');
  });

  it('başarılı yanıtta ham (doğrulanmamış) JSON döner', async () => {
    const rawBody = { data: [{ TARIH: '/Date(1754352000000)/', FONKODU: 'AFO', FIYAT: 1.2 }] };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rawBody),
    }) as unknown as typeof fetch;

    const result = await fetchTefasHistory({
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
      fetchTefasHistory({
        startDate: new Date('2025-08-01T00:00:00Z'),
        endDate: new Date('2025-08-07T00:00:00Z'),
      }),
    ).rejects.toThrow('HTTP 503');
  });
});

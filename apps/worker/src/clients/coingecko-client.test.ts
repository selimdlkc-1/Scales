// Unit test — global `fetch` mocklanır, gerçek CoinGecko API'sine asla gidilmez
// (.claude/rules/35-testing.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCoingeckoMarketChart } from './coingecko-client.js';

describe('fetchCoingeckoMarketChart', () => {
  const originalApiKey = process.env.COINGECKO_API_KEY;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.COINGECKO_API_KEY;
  });

  afterEach(() => {
    process.env.COINGECKO_API_KEY = originalApiKey;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('coinId ve days ile doğru URL oluşturur, API key yoksa header eklenmez', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ prices: [] }),
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await fetchCoingeckoMarketChart({ coinId: 'bitcoin', days: 10 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/api/v3/coins/bitcoin/market_chart');
    expect(url.searchParams.get('vs_currency')).toBe('try');
    expect(url.searchParams.get('days')).toBe('10');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-cg-demo-api-key']).toBeUndefined();
  });

  it('COINGECKO_API_KEY tanımlıysa demo-tier header alanında gönderilir', async () => {
    process.env.COINGECKO_API_KEY = 'test-cg-key';
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ prices: [] }),
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await fetchCoingeckoMarketChart({ coinId: 'ethereum', days: 10 });

    const [, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['x-cg-demo-api-key']).toBe('test-cg-key');
  });

  it('başarılı yanıtta ham (doğrulanmamış) JSON döner', async () => {
    const rawBody = { prices: [[1704844800000, 43250.12]] };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(rawBody),
    }) as unknown as typeof fetch;

    const result = await fetchCoingeckoMarketChart({ coinId: 'bitcoin', days: 10 });

    expect(result).toEqual(rawBody);
  });

  it('HTTP hata kodu dönerse (5xx) exception fırlatır — job seviyesi retry bunu yakalar', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;

    await expect(fetchCoingeckoMarketChart({ coinId: 'bitcoin', days: 10 })).rejects.toThrow(
      'HTTP 503',
    );
  });
});

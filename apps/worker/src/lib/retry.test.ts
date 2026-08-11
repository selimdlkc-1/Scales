// Unit test — dış bağımlılık yok (DB'ye gitmez), yalnızca `withRetry`'ın kendi
// mantığını kanıtlar. Gerçek bekleme sürelerini test yavaşlatmasın diye varsayılan
// dışındaki testlerde küçük `backoffMs` verilir; varsayılan (1s→2s→4s) senaryosu
// `vi.useFakeTimers()` ile gerçek zaman geçmeden doğrulanır.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { withRetry } from './retry.js';

describe('withRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ilk denemede başarılıysa fn bir kez çağrılır, bekleme olmaz', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await withRetry(fn, { backoffMs: [10, 20, 40] });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('2. denemede başarılı olursa sonucu döner, fn iki kez çağrılır', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce('ok');

    const result = await withRetry(fn, { backoffMs: [10, 20, 40] });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('3 tekrar deneme de başarısızsa orijinal hatayı fırlatır (toplam 4 çağrı)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

    await expect(withRetry(fn, { backoffMs: [10, 20, 40] })).rejects.toThrow('ECONNRESET');
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('Error olmayan bir değer fırlatılırsa genel bir Error ile sarılır', async () => {
    const fn = vi.fn().mockRejectedValue('not-an-error-string');

    await expect(withRetry(fn, { backoffMs: [10] })).rejects.toThrow('bilinmeyen nedenle');
  });

  it('attempts özel verilirse backoffMs uzunluğundan bağımsız çalışır (1 tekrar deneme)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'));

    await expect(withRetry(fn, { attempts: 1, backoffMs: [10, 20, 40] })).rejects.toThrow('x');
    // 1 ilk deneme + 1 tekrar deneme = 2 çağrı.
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('docs/04_BACKEND_SPEC.md §8 varsayılanı (1s→2s→4s, 3 deneme) fake timer ile doğrulanır', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

    const pending = withRetry(fn);
    const assertion = expect(pending).rejects.toThrow('ECONNRESET');

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    await assertion;
    expect(fn).toHaveBeenCalledTimes(4);
  });
});

// Generic retry/backoff helper — docs/04_BACKEND_SPEC.md §8: dış API çağrısı
// başarısız olursa (timeout/5xx) aynı çalıştırma içinde exponansiyel backoff ile
// 3 defaya kadar tekrar denenir (1s → 2s → 4s bekleme) — toplam 1 ilk deneme +
// 3 tekrar deneme = 4 deneme. TCMB/TEFAS/CoinGecko job'larının üçü de bu tek
// helper'ı kullanır (Faz 2 §2.4 refactor, docs/10_IMPLEMENTATION_ROADMAP.md §2.4);
// öncesinde her job dosyasında aynı kod inline tekrarlanıyordu.
//
// Kapsam notu: `withRetry` çağırana verilen `fn`'in fırlattığı **her** hatayı retry
// eder — dış API isteğinin (timeout/5xx) hatasıyla sınırlıdır çünkü Zod doğrulaması
// çağıran job kodunda `withRetry`'ın DIŞINDA, ayrı bir adımda yapılır (bkz.
// tcmb-job.ts/tefas-job.ts/coingecko-job.ts — `withRetry(() => fetchXxx(...))`'a
// yalnızca ham istek verilir, doğrulama sonrasında yapılır). Bir doğrulama hatasını
// retry etmek yanlış olurdu (doğrulama hatası retry ile çözülmez); bu ayrım
// `withRetry`'a ne verildiğiyle sağlanır, `withRetry`'ın kendisiyle değil.
export interface RetryOptions {
  /** Toplam tekrar deneme sayısı (ilk deneme hariç). Varsayılan: 3. */
  attempts?: number;
  /** Her tekrar denemeden önce beklenecek süre (ms), sırayla. Varsayılan: [1000, 2000, 4000]. */
  backoffMs?: number[];
}

const DEFAULT_BACKOFF_MS = [1000, 2000, 4000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `fn`'i çağırır; başarısız olursa `backoffMs` dizisindeki süreler kadar bekleyip
 * tekrar dener. Son denemede de başarısız olursa orijinal hatayı fırlatır — çağıran
 * taraf bunu yakalayıp job'u `failed` işaretlemekle (TCMB/TEFAS) veya yalnızca
 * ilgili kaydı atlamakla (CoinGecko, coin-bazlı) sorumludur.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  const attempts = options.attempts ?? backoffMs.length;

  let lastError: unknown;
  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(backoffMs[attempt] ?? 0);
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('withRetry: istek bilinmeyen nedenle başarısız oldu');
}

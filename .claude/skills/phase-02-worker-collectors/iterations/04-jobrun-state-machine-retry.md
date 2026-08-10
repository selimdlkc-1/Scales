### İterasyon 4 — JobRun State Machine ve Retry/Backoff (§2.4)

**Hedef:** `docs/01_DOMAIN_MODEL.md §5`'teki durum geçişlerinin ve `docs/04_BACKEND_SPEC.md §8`'deki exponansiyel backoff'un ortak bir yardımcıda toplanması; üç job da (TCMB/TEFAS/CoinGecko) kendi inline kopyaları yerine bu ortak helper'ı kullanır hale getirilir (refactor, davranış değişmez).

**Teslim çıktısı:**
- `apps/worker/src/lib/job-lifecycle.ts` (state transition: `createPendingJobRun`, `markRunning`, `finishJobRun`)
- `apps/worker/src/lib/retry.ts` (generic `withRetry` — 1s→2s→4s, 3 deneme)
- `jobs/tcmb-job.ts`, `jobs/tefas-job.ts`, `jobs/coingecko-job.ts` refactor edilmiş (ortak helper'ı kullanır)
- `lib/job-lifecycle.test.ts`, `lib/retry.test.ts`

**Önkoşullar:**
- [ ] İterasyon 1–3 Stop tamam (üç job da fixture ile yeşil)
- [ ] `refactor/jobrun-state-machine-retry` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §2.4 — iterasyon kapsamı ("üç job da aynı yardımcı fonksiyonu kullanır")
2. `docs/01_DOMAIN_MODEL.md` §5 — state machine tablosu (geçişler, backend nasıl zorlar)
3. `docs/04_BACKEND_SPEC.md` §8 — retry/backoff parametreleri, idempotency

**Uygulama planı:**
1. `lib/job-lifecycle.ts` — `createPendingJobRun(dataSource)` (insert, `status='pending'`), `markRunning(jobRunId)` (`status='running'`, `started_at=now()`), `finishJobRun(jobRunId, { status, recordsUpserted, errorMessage })` (terminal durum + `finished_at`) — `docs/01` §5 tablosundaki her sütun birebir.
2. `lib/retry.ts` — `withRetry<T>(fn: () => Promise<T>, { attempts: 3, backoffMs: [1000, 2000, 4000] })` generic helper; 3. denemede de başarısızsa orijinal hatayı fırlatır (çağıran taraf bunu yakalayıp `failed` işaretler).
3. `jobs/tcmb-job.ts` refactor — kendi inline `pending`/`running`/terminal update kodu ve retry döngüsü kaldırılıp `job-lifecycle.ts` + `retry.ts` import edilir; **davranış değişmez**, İterasyon 1'deki testler hâlâ geçmeli.
4. `jobs/tefas-job.ts`, `jobs/coingecko-job.ts` aynı refactor'dan geçirilir.
5. `lib/job-lifecycle.test.ts` — her state geçişi için unit test; `lib/retry.test.ts` — 3 denemeden sonra başarısızlık + 2. denemede başarı senaryoları.
6. Refactor sonrası **üç job'un mevcut testlerinin tamamı** (İterasyon 1–3) tekrar çalıştırılır — regresyon kontrolü.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `lib/job-lifecycle.ts` (+ `.test.ts`), `lib/retry.ts` (+ `.test.ts`) |
| Güncelle | `jobs/tcmb-job.ts`, `jobs/tefas-job.ts`, `jobs/coingecko-job.ts` (ortak helper kullanımı) |
| Dokunma | `entrypoints/*` (değişmez), cron config (İterasyon 5) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| `pending`→`running`→`success`/`partial`/`failed` | `docs/01_DOMAIN_MODEL.md` §5 | `job-lifecycle.ts` 3 fonksiyon |
| 1s→2s→4s, 3 deneme | `docs/04_BACKEND_SPEC.md` §8 | `retry.ts` `withRetry` generic |
| "Üç job da aynı yardımcıyı kullanır" | `docs/10_IMPLEMENTATION_ROADMAP.md` §2.4 | 3 job dosyası import edip kullanır, kod tekrarı kalkar |
| Idempotent upsert (regresyon) | `docs/02_DATABASE_SCHEMA.md` §2.3 | Refactor sonrası İterasyon 1–3'ün idempotency testleri hâlâ geçer |

**Kalite kapıları:**
- [ ] `job-lifecycle.test.ts`: her state geçişi ayrı test
- [ ] `retry.test.ts`: 3 denemeden sonra `failed`, 2. denemede başarı senaryoları
- [ ] Refactor sonrası İterasyon 1–3'ün testlerinin **tamamı** hâlâ yeşil (regresyon yok)
- [ ] `apps/worker` coverage ≥%60 korunuyor

**Bu iterasyonda yok:** Cron zamanlaması/deploy (İterasyon 5), yeni bir veri kaynağı/job.

**Risk / dikkat:** Refactor sırasında üç job'u aynı anda değiştirip tek seferde test etmek riskli — her job tek tek güncellenip kendi testi tekrar çalıştırılmalı (TCMB → test → TEFAS → test → CoinGecko → test). `withRetry`'ın hangi hata tiplerinde (yalnızca timeout/5xx, yoksa her exception'da mı) tetikleneceği `docs/04` §8'e sadık kalınarak net tanımlanmalı — beklenmeyen bir doğrulama hatasını da retry etmek yanlıştır (doğrulama hatası retry ile çözülmez, doğrudan `partial`/atlama).

**Stop:**
- [ ] `pnpm --filter worker vitest run` (tüm worker testleri, üçü + yeni helper testleri)
- [ ] PR/onay → İterasyon 5

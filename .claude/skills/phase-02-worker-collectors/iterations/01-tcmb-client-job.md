### İterasyon 1 — TCMB EVDS Client ve Job (§2.1)

**Hedef:** `clients/tcmb-client.ts` + `jobs/tcmb-job.ts` çalışır; fixture tabanlı integration test yeşil; başarılı çalıştırma `job_runs`'a `success` ile yazılır.

**Teslim çıktısı:**
- `apps/worker/src/clients/tcmb-client.ts`
- `apps/worker/src/jobs/tcmb-job.ts`
- `apps/worker/src/entrypoints/run-tcmb.ts`
- `apps/worker/src/jobs/__fixtures__/tcmb-success.json`, `tcmb-malformed.json`
- `apps/worker/src/jobs/tcmb-job.test.ts`

**Önkoşullar:**
- [ ] Faz 1 Done Definition tamam (Prisma schema, `schemas/external/tcmb-response.ts`, seed veri hazır)
- [ ] Local Postgres ayakta, migration uygulanmış
- [ ] `feat/tcmb-client-job` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §2.1 — iterasyon kapsamı
2. `docs/04_BACKEND_SPEC.md` §7–8 — transaction yönetimi (3 adımlı akış), retry/backoff, zamanlama
3. `docs/07_SECURITY_IMPLEMENTATION.md` §6 — SEC-007 dış kaynak doğrulama zorunluluğu
4. `docs/08_TESTING_STRATEGY.md` §5 — fixture stratejisi (iyi huylu + bozuk veri), test DB izolasyonu

**Uygulama planı:**
1. `clients/tcmb-client.ts` — `fetch` tabanlı TCMB EVDS API client (`TCMB_EVDS_API_KEY` ile), ham JSON döner, **doğrulama yapmaz** (doğrulama job seviyesinde).
2. `jobs/tcmb-job.ts` — 3 adımlı akış (`docs/04` §7): (1) `job_runs`'a `pending` satırı ekle, (2) client çağrısı (1s→2s→4s exponansiyel backoff, 3 deneme, `docs/04` §8) + `tcmbResponseSchema.safeParse` + `Prisma.$transaction` içinde toplu upsert (`asset_prices` + `cpi_index` — TCMB hem döviz/altın fiyatı hem TÜFE sağlar), (3) `job_runs` satırını terminal durumla (`success`/`partial`/`failed`) güncelle.
3. `entrypoints/run-tcmb.ts` — CLI giriş noktası, job'u çağırıp `process.exit` ile sonlanır (`docs/04` §8 — daemon değil).
4. `jobs/__fixtures__/tcmb-success.json` (tam, geçerli yanıt) ve `tcmb-malformed.json` (eksik alan/beklenmeyen tip) fixture'ları.
5. `jobs/tcmb-job.test.ts` — success (fixture ile) + partial (bozuk kayıt atlanır, kalanlar upsert edilir) + failed (client 3 kez başarısız simülasyonu) + idempotent upsert (aynı gün iki kez çalıştırma → veri çoğalmaz) senaryoları.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `clients/tcmb-client.ts`, `jobs/tcmb-job.ts`, `jobs/tcmb-job.test.ts`, `entrypoints/run-tcmb.ts`, `jobs/__fixtures__/tcmb-success.json`, `jobs/__fixtures__/tcmb-malformed.json` |
| Güncelle | — |
| Dokunma | `jobs/tefas-job.ts`, `jobs/coingecko-job.ts` (İterasyon 2–3), ortak state-machine/retry helper (İterasyon 4'te bu iterasyonun inline retry kodu oraya taşınacak) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| `pending`→`running`→terminal | `docs/01_DOMAIN_MODEL.md` §5 | `job_runs` 1 insert + 2 update |
| SEC-007 doğrulama | `docs/07` §6 | `tcmbResponseSchema.safeParse` transaction'dan önce |
| Retry 1s→2s→4s, 3 deneme | `docs/04` §8 | Client çağrısı etrafında exponansiyel backoff |
| Idempotent upsert | `docs/02_DATABASE_SCHEMA.md` §2.3 `UNIQUE` | Prisma upsert by `(asset_id, as_of_date)` |
| Toplu transaction | `docs/04` §7 | `Prisma.$transaction`, hepsi ya da hiçbiri |

**Kalite kapıları:**
- [ ] Fixture success → `job_runs.status='success'`, `records_upserted` doğru
- [ ] Fixture malformed → `partial`, hatalı kayıt atlanır, `error_message` dolu
- [ ] Client 3 kez başarısız simülasyonu → `failed`
- [ ] Aynı gün iki kez çalıştırma → veri çoğalmaz
- [ ] `apps/worker` coverage katkısı ≥%60 hedefine doğru ilerliyor

**Bu iterasyonda yok:** TEFAS/CoinGecko job'ları (İterasyon 2–3), ortak retry/state-machine helper'ı (İterasyon 4 — bu iterasyonda retry inline yazılır, sonra ortak hale getirilir), cron zamanlaması (İterasyon 5).

**Risk / dikkat:** TCMB EVDS gerçek API'sine testte **asla** gidilmez (`.claude/rules/35-testing.md`) — yalnızca fixture. `TCMB_EVDS_API_KEY` `.env.example`'da zaten placeholder var (Faz 0 §0.4); gerçek key yalnızca staging/production'da kullanılır (İterasyon 5 human gate).

**Stop:**
- [ ] `pnpm --filter worker vitest run jobs/tcmb-job.test.ts`
- [ ] PR/onay → İterasyon 2

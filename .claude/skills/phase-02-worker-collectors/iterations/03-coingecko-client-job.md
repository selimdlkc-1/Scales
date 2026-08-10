### İterasyon 3 — CoinGecko Client ve Job (§2.3)

**Hedef:** `clients/coingecko-client.ts` + `jobs/coingecko-job.ts` çalışır; 5 coin (BTC, ETH, SOL, BNB, XRP) için fixture testi yeşil.

**Teslim çıktısı:**
- `apps/worker/src/clients/coingecko-client.ts`
- `apps/worker/src/jobs/coingecko-job.ts`
- `apps/worker/src/entrypoints/run-coingecko.ts`
- `apps/worker/src/jobs/__fixtures__/coingecko-success.json`, `coingecko-malformed.json`
- `apps/worker/src/jobs/coingecko-job.test.ts`

**Önkoşullar:**
- [ ] İterasyon 2 Stop tamam
- [ ] `feat/coingecko-client-job` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §2.3 — iterasyon kapsamı (5 coin)
2. `docs/04_BACKEND_SPEC.md` §8 — zamanlama (4 saatte bir), rate limit dikkat notu (ücretsiz katman kotası, `docs/10` §5 risk kaydı)
3. `docs/02_DATABASE_SCHEMA.md` §2.2 — `assets.external_ref` (CoinGecko coin id eşlemesi)

**Uygulama planı:**
1. `clients/coingecko-client.ts` — `fetch` tabanlı CoinGecko API client, 5 coin id'sini (`assets.external_ref`, Faz 1 §1.3 seed'inden) tek istekte veya 5 ayrı istekte çeker; `COINGECKO_API_KEY` varsa header'a eklenir (opsiyonel, `docs/04` §10).
2. `jobs/coingecko-job.ts` — İterasyon 1–2 ile aynı 3 adımlı akış: `pending` → client çağrısı + `coingeckoResponseSchema.safeParse` → `Prisma.$transaction` ile `asset_prices` toplu upsert → terminal durum.
3. `entrypoints/run-coingecko.ts` — CLI giriş noktası.
4. `jobs/__fixtures__/coingecko-success.json` (5 coin, tam) + `coingecko-malformed.json` (en az 1 coin eksik/bozuk alan).
5. `jobs/coingecko-job.test.ts` — 5 coin'in tümü başarılı (success) + kısmi bozuk (partial) + idempotent upsert testi.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `clients/coingecko-client.ts`, `jobs/coingecko-job.ts`, `jobs/coingecko-job.test.ts`, `entrypoints/run-coingecko.ts`, `jobs/__fixtures__/coingecko-success.json`, `jobs/__fixtures__/coingecko-malformed.json` |
| Güncelle | — |
| Dokunma | `jobs/tcmb-job.ts`, `jobs/tefas-job.ts` (İterasyon 1–2, referans desen) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| 5 coin (BTC, ETH, SOL, BNB, XRP) | `docs/10` §2.3, `docs/02` §9 seed | `assets.external_ref` üzerinden CoinGecko coin id eşlemesi |
| 4 saatte bir zamanlama | `docs/04_BACKEND_SPEC.md` §8 | Cron ayarı İterasyon 5'te, burada yalnızca job mantığı |
| Ücretsiz katman kota riski | `docs/10_IMPLEMENTATION_ROADMAP.md` §5 risk kaydı | Client'ta gereksiz tekrar istek yapılmaz, 5 coin tek batch'te |
| SEC-007 doğrulama | `docs/07_SECURITY_IMPLEMENTATION.md` §6 | `coingeckoResponseSchema.safeParse` transaction'dan önce |

**Kalite kapıları:**
- [ ] Fixture success → `success`, 5 coin'in tamamı upsert
- [ ] Fixture malformed (1 coin bozuk) → `partial`, 4 coin upsert + 1 atlama
- [ ] Idempotent upsert testi
- [ ] `apps/worker` coverage ≥%60'a katkı

**Bu iterasyonda yok:** Ortak retry/state-machine helper'ı (İterasyon 4), cron zamanlaması (İterasyon 5).

**Risk / dikkat:** CoinGecko ücretsiz katmanı rate limit'e tabidir (`docs/10` §5 risk kaydı) — testte gerçek API'ye **asla** gidilmez, yalnızca fixture; gerçek çağrı yalnızca İterasyon 5'te staging'de tek seferlik yapılır.

**Stop:**
- [ ] `pnpm --filter worker vitest run jobs/coingecko-job.test.ts`
- [ ] PR/onay → İterasyon 4

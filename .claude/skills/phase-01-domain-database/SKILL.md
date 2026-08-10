---
name: phase-01-domain-database
description: '[Faz 1] Domain ve Veritabanı — 4 iterasyon/chat (Prisma schema+migration → Zod şemaları → seed script → hesaplama fonksiyonları+testler). Use when the user says "Faz 1", "Faz 1 — İterasyon N", or asks to add the Prisma schema, DB migration, external/API Zod schemas, seed data, or the real-return/normalized-return calculation functions. Do NOT use for worker jobs that consume this schema (Faz 2), API routes (Faz 3), or frontend (Faz 4).'
---

# Faz 1: Domain ve Veritabanı

## Goal

`packages/core` içinde domain katmanının temelini kurmak: Prisma schema + ilk migration (5 tablo), API/dış-kaynak Zod şemaları, idempotent seed script'i, ve reel/normalize getiri hesaplama fonksiyonları — bu fazın sonunda `packages/core` %90+ coverage hedefi ilk kez ölçülür ve CI'a `test` job'u eklenir ([P-004] — veri katmanı önceliği). Detay: `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 1.

## Feature branch (zorunlu)

Her iterasyon kendi `§1.M` alt maddesine karşılık gelir — `git-phase-branch` skill'i **her iterasyon başında ayrı** çalıştırılır:

| İterasyon | Branch |
| --- | --- |
| 1 (§1.1) | `feat/prisma-schema-migration` |
| 2 (§1.2) | `feat/zod-schemas` |
| 3 (§1.3) | `feat/seed-script` |
| 4 (§1.4) | `feat/calculation-functions` |

## Bu fazın çalışma modeli

- Tek sohbet fazı bitirmez — her chat başında **「Faz 1 — İterasyon M」** belirt.
- Agent yalnızca o iterasyonun **Docs okuma sırası**nı okur.
- Plan moduna geçme — aşağıdaki iterasyon blueprint'i yeterli.

## Required Context

- `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 1 (§1.1–§1.4) — faz geneli
- `.claude/rules/16-database-prisma.md`, `04-quality-gates.md`, `03-security-baseline.md` — zaten yüklü (path-scoped/koşulsuz), tekrar edilmez

## Done Definition

- [ ] `packages/core/prisma/schema.prisma` 5 tabloyu (`docs/02` §2) tüm constraint/index ile içeriyor, migration lokal DB'ye uygulanmış
- [ ] `schemas/api/*.ts` + `schemas/external/*.ts` yazılmış, her biri en az 1 pozitif + 1 deny testiyle kanıtlanmış
- [ ] Seed script'i idempotent — iki kez çalıştırıldığında satır çoğalmıyor; `asset_classes` 4, `assets` 68 satır
- [ ] `real-return.ts`, `normalized-return.ts` `docs/01` §6 formülleriyle birebir, eksik veri → `null` (exception yok)
- [ ] `packages/core` coverage ≥%90 (`vitest --coverage`), CI'da `lint`→`test`→`build` sıralı ve yeşil

## Explicit Don'ts

- Worker client/job kodu yazma (bu şemaları/fonksiyonları tüketen kod, Faz 2)
- API route yazma (Faz 3)
- Production seed'i gerçek ortamda çalıştırma (Faz 5 §5.6, operatör onayına tabi)
- Yeni bir decimal/aritmetik kütüphanesi eklemek — Prisma'nın kendi `Decimal` export'u kullanılır (bkz. İterasyon 4 Risk notu), aksi halde `write-adr` gerekir

---

## İterasyon 1 — Prisma Schema ve İlk Migration (§1.1)

**Hedef:** `docs/02_DATABASE_SCHEMA.md §2`'deki 5 tablo (`asset_classes`, `assets`, `asset_prices`, `cpi_index`, `job_runs`) tüm constraint/index (§4–§5) ile Prisma schema'da tanımlı; ilk migration lokal DB'ye başarıyla uygulanmış.

**Teslim çıktısı:**
- `packages/core/prisma/schema.prisma`
- İlk migration (`packages/core/prisma/migrations/<ts>_init/`)
- `packages/core/src/prisma/client.ts` (tekil `PrismaClient` singleton)

**Önkoşullar:**
- [ ] Faz 0 Done Definition tamam (`pnpm install`, `docker compose up -d`, `.env`'de `DATABASE_URL` dolu)
- [ ] `feat/prisma-schema-migration` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §1.1 — iterasyon kapsamı
2. `docs/02_DATABASE_SCHEMA.md` §1–2 — isimlendirme konvansiyonu + 5 tablonun tam alan/tip/default tanımı
3. `docs/02_DATABASE_SCHEMA.md` §4–5 — index stratejisi, ilişkiler/referans bütünlüğü (`ON DELETE` kuralları)
4. `docs/02_DATABASE_SCHEMA.md` §8 — migration stratejisi (forward-fix politikası)

**Uygulama planı:**
1. `packages/core/prisma/schema.prisma` — `datasource`/`generator` + 5 model (`AssetClass`, `Asset`, `AssetPrice`, `CpiIndex`, `JobRun`); alan/tip/default `docs/02` §2.1–2.5 birebir, `@@map`/`@map` ile `snake_case` tablo/kolon adları.
2. Para/endeks alanları `Decimal @db.Decimal(20,6)` (`price`), `Decimal @db.Decimal(12,4)` (`index_value`) — asla `Float` (`.claude/rules/16-database-prisma.md`).
3. `@@unique([assetId, asOfDate])` (`asset_prices`), `@@unique([periodMonth])` (`cpi_index`), `@@unique([symbol])` (`assets`) — `docs/02` §2.3–2.4, §4.
4. `@@index([assetClassId])`, `@@index([isActive])`, `@@index([assetId, asOfDate(sort: Desc)])`, `@@index([dataSource, startedAt(sort: Desc)])` — `docs/02` §4.
5. FK ilişkileri: `Asset.assetClass` → `onDelete: Restrict`, `AssetPrice.asset` → `onDelete: Cascade` — `docs/02` §5.
6. `pnpm --filter core prisma migrate dev --name init` çalıştır; Prisma `CHECK` constraint'lerini native ifade edemediği için üretilen `migration.sql`'e `docs/02` §2.1/§2.2/§2.5'teki `CHECK (code IN (...))` / `CHECK (data_source IN (...))` / `CHECK (status IN (...))` satırlarını elle ekle (bu, sıfırdan SQL yazma değil, Prisma diff'inin eksik bıraktığı kısmı tamamlamadır).
7. `packages/core/src/prisma/client.ts` — tekil `PrismaClient` singleton export.
8. Migration'ı uygula, tablo/constraint'lerin oluştuğunu doğrula.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `packages/core/prisma/schema.prisma`, `packages/core/prisma/migrations/<ts>_init/migration.sql`, `packages/core/src/prisma/client.ts` |
| Güncelle | `packages/core/package.json` (`prisma`, `@prisma/client` deps + `db:*` script'leri) |
| Dokunma | `schemas/` (İterasyon 2), seed (İterasyon 3) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| 5 tablo tanımı | `docs/02` §2.1–2.5 | Prisma model alan/tip/default birebir |
| `UNIQUE (asset_id, as_of_date)` | `docs/02` §2.3, §4 | `@@unique` — idempotent upsert garantisi |
| `CHECK (data_source IN (...))` | `docs/02` §2.2/§2.5 | Prisma native değil — üretilen `migration.sql`'e elle eklenir |
| `ON DELETE RESTRICT`/`CASCADE` | `docs/02` §5 | Prisma relation `onDelete` alanı |
| `NUMERIC`, asla `Float` | `.claude/rules/16-database-prisma.md`, TS-006 | `@db.Decimal(p,s)` |

**Kalite kapıları:**
- [ ] `prisma migrate dev` hatasız, migration klasörü oluşmuş
- [ ] `prisma migrate status` "up to date"
- [ ] Elle eklenen `CHECK` constraint'ler doğrulanmış (geçersiz `code`/`status` denemesi DB tarafından reddediliyor)
- [ ] Bu iterasyonda test/coverage gate'i henüz başlamıyor (İterasyon 4'te başlar)

**Bu iterasyonda yok:** Zod şemaları (İterasyon 2), seed verisi (İterasyon 3), hesaplama fonksiyonları (İterasyon 4).

**Risk / dikkat:** Prisma native `CHECK` constraint desteklemez — elle eklenen kısım sonraki migration'larda Prisma tarafından fark edilmez, yeni bir migration üretilirken bu satırların yanlışlıkla silinmemesine dikkat edilmeli. `BIGSERIAL` PK, Prisma'da `Int @id @default(autoincrement()) @db.BigInt` şeklinde ifade edilir.

**Stop:**
- [ ] `pnpm --filter core prisma migrate dev --name init`
- [ ] `pnpm --filter core prisma migrate status`
- [ ] PR/onay → İterasyon 2

---

## İterasyon 2 — Zod Şemaları (§1.2)

**Hedef:** `packages/core/src/schemas/api/*.ts` (query parametreleri) ve `schemas/external/*.ts` (TCMB/TEFAS/CoinGecko yanıt şemaları) `docs/03_API_CONTRACTS.md` ve `SEC-007` ile birebir; her şema en az 1 pozitif + 1 deny testiyle kanıtlanmış.

**Teslim çıktısı:**
- `schemas/api/{comparison-query,series-query,assets-query,admin-job-runs-query}.ts` + eşlik eden `.test.ts`
- `schemas/external/{tcmb-response,tefas-response,coingecko-response}.ts` + eşlik eden `.test.ts`
- `packages/core` Vitest kurulumu (`vitest.config.ts`, henüz coverage eşiği zorlanmıyor)

**Önkoşullar:**
- [ ] İterasyon 1 Stop tamam
- [ ] `feat/zod-schemas` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §1.2 — iterasyon kapsamı
2. `docs/03_API_CONTRACTS.md` §5.1–5.3 — her endpoint'in query parametre tablosu
3. `docs/07_SECURITY_IMPLEMENTATION.md` §6 — SEC-007 dış kaynak doğrulama zorunluluğu
4. `docs/08_TESTING_STRATEGY.md` §5 — fixture stratejisi (iyi huylu + bozuk veri senaryoları)

**Uygulama planı:**
1. `packages/core`'a `vitest` + `@vitest/coverage-v8` devDependency ekle, `vitest.config.ts` kur (`provider: 'v8'`, threshold henüz eklenmez — İterasyon 4'te).
2. `schemas/api/comparison-query.ts` — `assets` (virgülle ayrılmış opsiyonel), `period` enum(`1m`,`3m`,`1y`,`3y`,`5y`) zorunlu, `sortBy` enum(`realReturn`,`nominalReturn`,`symbol`) opsiyonel varsayılan `realReturn`, `sortDir` enum(`asc`,`desc`) opsiyonel varsayılan `desc` (`docs/03` §5.2).
3. `schemas/api/series-query.ts` — `assets` zorunlu (virgüllü sembol listesi **format** doğrulaması burada; 2–5 adet **sayı** kısıtı Zod'da değil, Faz 3 §3.3'te servis katmanında `InvalidAssetSelectionError` olarak ele alınır — `docs/03` §3 `INVALID_ASSET_SELECTION` `VALIDATION_ERROR`'dan ayrı bir kod), `period` zorunlu.
4. `schemas/api/assets-query.ts` — `assetClass` enum(`fx`,`gold`,`crypto`,`fund`) opsiyonel (`docs/03` §5.1).
5. `schemas/api/admin-job-runs-query.ts` — `dataSource` enum(`tcmb`,`tefas`,`coingecko`) opsiyonel, `limit` integer 1–200 opsiyonel varsayılan 50 (`docs/03` §5.3).
6. `schemas/external/{tcmb,tefas,coingecko}-response.ts` — worker job'larının (Faz 2) tüketeceği dış API yanıt iskeletleri; zorunlu alan tipleri (fiyat → decimal-string, tarih → ISO) burada sabitlenir.
7. Her şema için `.test.ts` — pozitif + deny (external şemalarda "bozuk veri": eksik alan, beklenmeyen tip — `docs/08` §5).

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `schemas/api/*.ts` (+ `.test.ts`), `schemas/external/*.ts` (+ `.test.ts`), `packages/core/vitest.config.ts` |
| Güncelle | `packages/core/src/index.ts` (barrel export), `packages/core/package.json` (vitest deps) |
| Dokunma | Gerçek worker client'ları (Faz 2), gerçek API route'ları (Faz 3) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| `period` sabit enum | `docs/03` §5.2 | `z.enum(['1m','3m','1y','3y','5y'])` |
| `assets` 2–5 kısıtı (series) | `docs/03` §3 `INVALID_ASSET_SELECTION` | Zod yalnızca format doğrular; sayı kısıtı Faz 3'te servis katmanında |
| Dış kaynak yanıtı DB'ye yazılmadan doğrulanır | `docs/07` §6 SEC-007 | `schemas/external/*.ts` zorunlu, atlanamaz |
| `limit` 1–200, varsayılan 50 | `docs/03` §5.3 | `z.coerce.number().int().min(1).max(200).default(50)` |

**Kalite kapıları:**
- [ ] `pnpm --filter core vitest run` tüm şema testleri yeşil
- [ ] Her API query şeması: 1 pozitif + 1 deny (geçersiz enum/tip) testi
- [ ] Her external şema: 1 geçerli + 1 "bozuk veri" (eksik alan/beklenmeyen tip) deny testi — TEFAS için özellikle kritik (`docs/07` §1 threat model)

**Bu iterasyonda yok:** Gerçek worker client'ları/job'lar (Faz 2), gerçek API route'ları (Faz 3), coverage eşiğinin CI'da zorlanması (İterasyon 4).

**Risk / dikkat:** External şema aşırı katı yazılırsa (`.strict()` ile bilinmeyen alanı reddetme) TEFAS'ın küçük format değişikliklerinde gereksiz `partial` durumuna yol açar — Zod'un varsayılan davranışı (bilinmeyen alanı yok say) tercih edilir, `.strict()` kullanılmaz.

**Stop:**
- [ ] `pnpm --filter core vitest run`
- [ ] PR/onay → İterasyon 3

---

## İterasyon 3 — Seed Script (§1.3)

**Hedef:** `asset_classes` (4 satır) + `assets` (USD/TRY, EUR/TRY, XAUTRY, BTC, ETH, SOL, BNB, XRP + TEFAS 4 kategori × 15 fon = 68 satır) idempotent seed ile lokal DB'ye yüklü.

**Teslim çıktısı:**
- `packages/core/prisma/seed.ts`
- `packages/core/prisma/seed-data/tefas-funds.ts` (60 fon statik liste)

**Önkoşülar:**
- [ ] İterasyon 2 Stop tamam
- [ ] `feat/seed-script` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §1.3 — iterasyon kapsamı
2. `docs/02_DATABASE_SCHEMA.md` §9 — seed verisi tablosu (ortam bazlı kapsam)
3. `docs/01_DOMAIN_MODEL.md` §2.1–2.2 — `AssetClass`/`Asset` sorumluluk, yaşam döngüsü, `is_active` kuralı

**Uygulama planı:**
1. `packages/core/prisma/seed.ts` — `asset_classes` 4 satır (`fx`,`gold`,`crypto`,`fund`, `docs/02` §2.1 `name_tr`+`sort_order`), upsert by `code`.
2. `assets` — USD/TRY, EUR/TRY (fx, `data_source=tcmb`), XAUTRY (gold, tcmb), BTC/ETH/SOL/BNB/XRP (crypto, coingecko) — `symbol`/`name_tr`/`external_ref` (`docs/02` §2.2), upsert by `symbol`.
3. TEFAS fonları — 4 kategori × 15 fon, `symbol` formatı `TEFAS:<kod>` (`docs/03` örnek `TEFAS:AFA`), `data_source=tefas`; gerçek, kamuya açık TEFAS fon kodlarından statik liste kullanılır (`packages/core/prisma/seed-data/tefas-funds.ts`), upsert by `symbol`.
4. `packages/core/package.json`'a `prisma.seed` config + `db:seed` script ekle.
5. `pnpm --filter core prisma db seed` çalıştır, tekrar çalıştırıp satır sayısının değişmediğini (idempotency) doğrula.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `packages/core/prisma/seed.ts`, `packages/core/prisma/seed-data/tefas-funds.ts` |
| Güncelle | `packages/core/package.json` (`prisma.seed` alanı, `db:seed` script) |
| Dokunma | Gerçek fiyat verisi (`asset_prices`/`cpi_index`, yalnızca worker job'ları yazar, Faz 2) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| 4 `asset_classes` | `docs/02` §9, §2.1 | upsert by `code` |
| 8 döviz/altın/kripto | `docs/10` §1.3, `docs/02` §2.2 | upsert by `symbol` |
| TEFAS 4×15=60 fon | `docs/10` §1.3 | `symbol` formatı `TEFAS:<kod>`, upsert by `symbol` |
| Seed idempotent | `.claude/rules/16-database-prisma.md` | upsert (create-or-update), asla plain `create` |

**Kalite kapıları:**
- [ ] `pnpm --filter core prisma db seed` iki kez art arda çalıştırılır, ikinci çalıştırmada satır sayısı değişmez
- [ ] `asset_classes` 4 satır, `assets` 68 satır (8+60)
- [ ] Seed'in upsert mantığı için en az 1 test — ikinci çağrıda yeni satır eklemediğini doğrulayan (`docs/08` §4 idempotency deny senaryosunun seed'e uyarlanmış hali)

**Bu iterasyonda yok:** Gerçek `asset_prices`/`cpi_index` verisi (Faz 2), production seed çalıştırması (Faz 5 §5.6, operatör onayına tabi).

**Risk / dikkat:** `is_active` varsayılan `true` — seed'de yanlışlıkla `false` girilirse Faz 3'teki karşılaştırma tablosu o varlığı hiç göstermez (`docs/01` §4 madde 4). Uydurma TEFAS fon kodu kullanılmamalı — Faz 2 §2.2'de worker gerçek TEFAS API'sinden bu kodları sorgulayacak.

**Stop:**
- [ ] `pnpm --filter core prisma db seed` (iki kez, idempotency doğrula)
- [ ] `SELECT count(*) FROM assets;` → 68
- [ ] PR/onay → İterasyon 4

---

## İterasyon 4 — Hesaplama Fonksiyonları ve Unit Testler (§1.4)

**Hedef:** `real-return.ts`, `normalized-return.ts` (`docs/01_DOMAIN_MODEL.md §6` formülleri) + Vitest unit testleri; `packages/core` için %90+ coverage hedefi ilk kez bu iterasyonda karşılanır; CI'a `test` job'u eklenir.

**Teslim çıktısı:**
- `calculations/{nominal-return,real-return,normalized-return}.ts` + `.test.ts`
- `packages/core/vitest.config.ts` coverage threshold'ları (%90)
- `.github/workflows/ci.yml` güncellemesi (`test` job'u eklenir, sıra `lint`→`test`→`build`)

**Önkoşullar:**
- [ ] İterasyon 3 Stop tamam
- [ ] `feat/calculation-functions` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §1.4 — iterasyon kapsamı
2. `docs/01_DOMAIN_MODEL.md` §6 — 4 formül (`nominal_return`, `cpi_change`, `real_return`, `normalized_return`)
3. `docs/08_TESTING_STRATEGY.md` §2–4 — coverage hedefleri, kritik modül tanımı, zorunlu deny senaryoları
4. `.claude/rules/04-quality-gates.md` — CI gate sırası (INF-002)

**Uygulama planı:**
1. `calculations/nominal-return.ts` — `(end_price / start_price) - 1`, Prisma'nın export ettiği `Decimal` (decimal.js tabanlı) ile — asla `Number`/`Float` (TS-006).
2. `calculations/real-return.ts` — `cpi_change` yardımcı fonksiyonu + `((1 + nominal_return) / (1 + cpi_change)) - 1`; eksik başlangıç fiyatı/CPI durumunda `null` döner, exception fırlatmaz (`docs/08` §4 ilk deny senaryosu).
3. `calculations/normalized-return.ts` — `(price[t] / price[period_start]) * 100` serisi üretir.
4. Her fonksiyon için `.test.ts` — pozitif senaryo (elle hesaplanmış beklenen sonuç) + sıfır/eksik veri deny testi + ondalık hassasiyet testi.
5. `packages/core/vitest.config.ts` — `coverage: { provider: 'v8', thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 } }` (`docs/08` §2).
6. `.github/workflows/ci.yml`'e `test` job'u ekle (`needs: lint`), `build` job'u `needs: test` olacak şekilde günceller (`lint`→`test`→`build` sırası, `.claude/rules/04-quality-gates.md` INF-002).
7. `pnpm --filter core vitest run --coverage` ile %90+ doğrula; CI'da push ile doğrula.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `calculations/{nominal-return,real-return,normalized-return}.ts` (+ `.test.ts`) |
| Güncelle | `packages/core/vitest.config.ts` (thresholds), `.github/workflows/ci.yml` (`test` job) |
| Dokunma | `apps/web`, `apps/worker` — bu fonksiyonları henüz hiçbiri tüketmiyor (Faz 2/3'te import edilecek) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| `nominal_return` formülü | `docs/01` §6 | `(end_price/start_price)-1`, `Decimal` aritmetik |
| `real_return` formülü | `docs/01` §6 | `((1+nominal)/(1+cpi_change))-1` |
| `normalized_return` formülü | `docs/01` §6 | `(price[t]/price[start])*100` |
| Eksik veri → `null`, exception yok | `docs/08` §4 satır 1 | Guard clause + `null` return, `try/catch` değil |
| %90+ coverage | `docs/08` §2, `.claude/rules/04-quality-gates.md` | `vitest.config.ts` thresholds |
| Lint→Test→Build sırası | `.claude/rules/04-quality-gates.md` INF-002 | `ci.yml` job dependency zinciri güncellenir |

**Kalite kapıları:**
- [ ] Pozitif senaryo: bilinen fiyat/CPI çiftiyle elle hesaplanmış beklenen sonuç
- [ ] Deny: sıfır/eksik başlangıç fiyatı → `null`, exception yok (`docs/08` §4)
- [ ] Deny: eksik CPI verisi → `null`
- [ ] `packages/core` coverage ≥%90 (`vitest run --coverage`)
- [ ] CI'da `lint`→`test`→`build` sıralı, üçü de yeşil

**Bu iterasyonda yok:** `apps/web`/`apps/worker` tarafından bu fonksiyonların tüketilmesi (Faz 2/3), dependency taraması (Faz 5 §5.4).

**Risk / dikkat:** `docs/mimari-kararlar.md` [TS-006] yalnızca "string-safe hesaplama" der, belirli bir JS decimal kütüphanesi pinlemez — yeni bir paket (`decimal.js`, `big.js` vb.) eklemek `write-adr` gerektirir. Bunun yerine Prisma zaten transitive olarak `decimal.js` taşır ve `Prisma.Decimal`'i export eder — **yeni bağımlılık eklemeden** bu kullanılır.

**Stop:**
- [ ] `pnpm --filter core vitest run --coverage`
- [ ] `git push` ile CI tetikle, `lint`→`test`→`build` yeşil
- [ ] Faz 1 Done Definition kontrolü; `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 1 işareti
- [ ] PR/onay → Faz 2 (İterasyon 1)

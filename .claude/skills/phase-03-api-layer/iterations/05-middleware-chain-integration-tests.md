### İterasyon 5 — Middleware Zinciri ve Integration Testleri (§3.5)

**Hedef:** `withRateLimit`, `withValidation`, `withErrorHandling` (`docs/04_BACKEND_SPEC.md §4`) ortak higher-order function middleware olarak çıkarılır; İterasyon 1–4'teki route'lar (health hariç) bunları kullanacak şekilde refactor edilir; `docs/08_TESTING_STRATEGY.md §4`'teki bu faza ait tüm negatif senaryolar test edilir.

**Teslim çıktısı:**
- `apps/web/lib/middleware/{with-error-handling,with-rate-limit,with-validation}.ts` (+ `.test.ts`)
- 4 route'un (`asset-classes`, `assets`, `comparison`, `comparison/series`) refactor edilmiş hali
- Kapsamlı negatif senaryo integration test seti

**Önkoşullar:**
- [ ] İterasyon 1–4 Stop tamam (5 route da fixture/DB ile yeşil)
- [ ] `refactor/middleware-chain-integration-tests` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §3.5 — iterasyon kapsamı
2. `docs/04_BACKEND_SPEC.md` §4 — middleware zinciri tam kompozisyon deseni + sıra
3. `docs/04_BACKEND_SPEC.md` §6 — exception hiyerarşisi → HTTP çevrimi
4. `docs/08_TESTING_STRATEGY.md` §4 — zorunlu deny senaryoları tam liste
5. `docs/03_API_CONTRACTS.md` §6 — rate limit tablosu

**Uygulama planı:**
1. `lib/middleware/with-error-handling.ts` — `errors.ts`'teki (İterasyon 3) her exception sınıfını `docs/04` §6 tablosundaki HTTP koduna çevirir, `meta.requestId` üretir, yakalanmamış hatada `500 INTERNAL_ERROR` jenerik mesaj.
2. `lib/middleware/with-rate-limit.ts` — IP başına dakikada 60 istek (genel API, `docs/03` §6), in-memory sayaç; aşımda `429 RATE_LIMITED` + `Retry-After`.
3. `lib/middleware/with-validation.ts` — Zod şemasını query'ye uygular, hata → `400 VALIDATION_ERROR` + `details.field`/`details.received`.
4. İterasyon 1–3'teki 4 route (`health` hariç — rate limit'e tabi değil, `docs/03` §6) `withErrorHandling(withRateLimit(withValidation(schema, handler)))` kompozisyonuna geçirilir; kendi ad-hoc `try/catch`'leri kaldırılır.
5. Kapsamlı integration test seti — `docs/08` §4'teki bu faza ait tüm deny senaryoları: geçersiz `period`/`assetClass` → `400 VALIDATION_ERROR`, 6. varlık → `400 INVALID_ASSET_SELECTION`, rate limit aşımı → `429 RATE_LIMITED` (testte limit düşürülerek simüle edilir).

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `lib/middleware/with-error-handling.ts` (+`.test.ts`), `with-rate-limit.ts` (+`.test.ts`), `with-validation.ts` (+`.test.ts`) |
| Güncelle | `app/api/asset-classes/route.ts`, `app/api/assets/route.ts`, `app/api/comparison/route.ts`, `app/api/comparison/series/route.ts` |
| Dokunma | `app/api/health/route.ts` (rate limit'e tabi değil, envelope'a girmez), `withAdminAuth` (Faz 5 §5.1'de eklenecek 4. katman) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Middleware sırası (dıştan içe) | `docs/04` §4 | `withErrorHandling(withRateLimit(withValidation(...)))` |
| Genel API rate limit 60/dk | `docs/03` §6 | `with-rate-limit.ts` IP+pencere sayaç |
| Exception→HTTP çevrimi | `docs/04` §6 tablosu | `with-error-handling.ts` `instanceof` zinciri |
| Tüm negatif senaryolar | `docs/08` §4 | Her satır ayrı test |

**Kalite kapıları:**
- [ ] `docs/08` §4'teki bu faza ait tüm deny senaryoları test edilmiş: geçersiz `period`/`assetClass`, 6. varlık, rate limit aşımı
- [ ] 4 route (`health` hariç) refactor sonrası kendi ad-hoc hata kodu içermiyor, yalnızca domain exception `throw` ediyor
- [ ] `apps/web` coverage ≥%60 (Faz 3 sonunda ilk kez ölçülüp doğrulanır)
- [ ] Regresyon: İterasyon 1–4'ün pozitif testleri hâlâ yeşil

**Bu iterasyonda yok:** `withAdminAuth` (Faz 5 §5.1), admin endpoint'leri, frontend tüketimi (Faz 4).

**Risk / dikkat:** Refactor sırasında route bazında farklı davranmış ad-hoc hata mesajları (İterasyon 1–4'te elle yazılmış) merkezi middleware'e geçerken domain exception'a eşlenmeli — bire bir aynı `error.code` üretilmeli, aksi halde İterasyon 1–4'teki testler kırılır. Rate limit sayaçları in-memory (Redis yok, `docs/03` §6) — testte gerçek zaman beklemek yerine sayaç sıfırlama/mock kullanılmalı.

**Stop:**
- [ ] `pnpm --filter web vitest run` (tüm `apps/web` testleri)
- [ ] `pnpm --filter web vitest run --coverage` (`apps/web` ≥%60)
- [ ] Faz 3 Done Definition kontrolü; `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 3 işareti
- [ ] PR/onay → Faz 4 (İterasyon 1)

### İterasyon 1 — Admin API Endpoint'leri (§5.1)

**Hedef:** `GET /api/admin/job-runs`, `GET /api/admin/sources` çalışır; `withAdminAuth` middleware'i her iki route'u da sarmalıyor (`docs/07_SECURITY_IMPLEMENTATION.md §2–4`).

**Teslim çıktısı:**
- `apps/web/app/api/admin/job-runs/route.ts`, `app/api/admin/sources/route.ts`
- `apps/web/lib/middleware/with-admin-auth.ts`
- `apps/web/lib/services/admin-service.ts`
- `apps/web/lib/repositories/job-run-repository.ts`

**Önkoşullar:**
- [ ] Faz 3 Done Definition tamam (`withErrorHandling`/`withRateLimit`/`withValidation` ortak middleware'i hazır, Faz 3 §3.5)
- [ ] `feat/admin-api-endpoints` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §5.1 — iterasyon kapsamı
2. `docs/03_API_CONTRACTS.md` §4, §5.3 — auth header sözleşmesi, iki admin endpoint'in tam contract'ı
3. `docs/07_SECURITY_IMPLEMENTATION.md` §2–4 — auth akışı (sequence diagram), token/session yokluğu, yetkilendirme uygulaması (deny-by-default, defense in depth)

**Uygulama planı:**
1. `lib/middleware/with-admin-auth.ts` — `Authorization: Basic` header'ını parse eder, `OPERATOR_USERNAME`/`OPERATOR_PASSWORD` env ile karşılaştırır (`docs/07` §2 sequence diagram); eksik/hatalı → `401` + `WWW-Authenticate: Basic realm="Terazi Operator Panel"`.
2. `lib/repositories/job-run-repository.ts` — `findRecent({ dataSource?, limit })` (`docs/02` §4 `data_source`+`started_at DESC` index kullanımı).
3. `lib/services/admin-service.ts` — `getJobRuns({ dataSource?, limit })`, `getSourceHealth()` (`docs/03` §5.3 — `isStale` hesabı: TCMB/TEFAS 1 iş günü, CoinGecko 8 saat eşik).
4. `app/api/admin/job-runs/route.ts`, `app/api/admin/sources/route.ts` — Faz 3 §3.5'teki ortak middleware zincirine (`withErrorHandling(withRateLimit(withValidation(schema, withAdminAuth(handler))))`) baştan itibaren uygun kurulur.
5. `Cache-Control: no-store` (`docs/03` §5.3).
6. Integration test — auth'suz istek → `401`, doğru credential → `200`, `job-runs` query (`dataSource`/`limit`) doğrulaması, `sources` `isStale` hesabı.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `app/api/admin/job-runs/route.ts` (+`.test.ts`), `app/api/admin/sources/route.ts` (+`.test.ts`), `lib/middleware/with-admin-auth.ts` (+`.test.ts`), `lib/services/admin-service.ts` (+`.test.ts`), `lib/repositories/job-run-repository.ts` |
| Güncelle | — |
| Dokunma | `/admin` sayfası (İterasyon 2), `middleware.ts` (İterasyon 2, sayfa seviyesi koruma) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| `Authorization: Basic` karşılaştırma | `docs/07` §2 sequence, §3 | `with-admin-auth.ts` env var karşılaştırma |
| Deny-by-default, defense in depth | `docs/07` §4 | Her `/api/admin/*` route'u zorunlu `withAdminAuth` sarmalar |
| `isStale` hesabı (1 iş günü/8 saat) | `docs/03` §5.3 | `admin-service.ts` eşik mantığı |
| `no-store` cache | `docs/03` §5.3 | Route header |
| `WWW-Authenticate` header | `docs/03` §3 `UNAUTHORIZED` | `401` yanıtında header |

**Kalite kapıları:**
- [ ] Auth'suz istek → `401` (`docs/08` §4 deny senaryosu)
- [ ] Doğru credential → `200`, doğru veri şekli
- [ ] `job-runs` `dataSource`/`limit` query doğrulaması
- [ ] `sources` `isStale=true`/`false` doğru hesaplanmış (eski/yeni `started_at` fixture'larıyla)
- [ ] `apps/web` coverage ≥%60 korunuyor

**Bu iterasyonda yok:** `/admin` sayfası (İterasyon 2), HTTP güvenlik başlıkları/rate limit sertleştirmesi (İterasyon 3).

**Risk / dikkat:** `withAdminAuth`'un `middleware.ts` (sayfa seviyesi, İterasyon 2) ile aynı env var karşılaştırmasını yapması ama birbirinden **bağımsız iki katman** olması gerekir (`docs/07` §4 defense in depth) — biri atlanırsa diğeri korumayı sağlamalı.

**Stop:**
- [ ] `pnpm --filter web vitest run app/api/admin`
- [ ] PR/onay → İterasyon 2

### İterasyon 1 — Referans Veri Endpoint'leri (§3.1)

**Hedef:** `GET /api/asset-classes`, `GET /api/assets` çalışır; response envelope (`{data,meta}`) ve cache header'lar `docs/03_API_CONTRACTS.md §5.1` ile birebir.

**Teslim çıktısı:**
- `apps/web/app/api/asset-classes/route.ts`
- `apps/web/app/api/assets/route.ts`
- `apps/web/lib/services/reference-data-service.ts`
- `apps/web/lib/repositories/asset-class-repository.ts`, `asset-repository.ts`

**Önkoşullar:**
- [ ] Faz 1 Done Definition tamam (Prisma schema, seed verisi — `asset_classes`/`assets` DB'de dolu)
- [ ] Local Postgres ayakta, seed uygulanmış
- [ ] `feat/reference-data-endpoints` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §3.1 — iterasyon kapsamı
2. `docs/03_API_CONTRACTS.md` §1–2 — genel sözleşme, response envelope
3. `docs/03_API_CONTRACTS.md` §5.1 — iki endpoint'in tam contract'ı (query, response, cache)
4. `docs/04_BACKEND_SPEC.md` §1–3 — route→service→repository katmanlaması, DI kalıbı

**Uygulama planı:**
1. `lib/repositories/asset-class-repository.ts` — `findAll()`, `sort_order`'a göre sıralı, düz TS nesnesi döner (Prisma tipi dışarı sızmaz).
2. `lib/repositories/asset-repository.ts` — `findActive({ assetClass? })`, `is_active=true` filtre + opsiyonel `assetClass` filtresi (`docs/02` §4 partial index kullanımı).
3. `lib/services/reference-data-service.ts` — `getAssetClasses()`, `getAssets({ assetClass? })`; repository'yi çağırır, `snake_case` DB alanlarını `camelCase` response alanlarına dönüştürür (`docs/02` vs `docs/03` §5.1 örnek).
4. `app/api/asset-classes/route.ts` — `GET` handler, servisi çağırır, `{data,meta}` envelope + `Cache-Control: public, max-age=86400`.
5. `app/api/assets/route.ts` — `assetClass` query param'ını Faz 1'de yazılan `assets-query.ts` şemasıyla parse eder (bu iterasyonda doğrudan `.safeParse`, merkezi middleware henüz yok — İterasyon 5'te taşınacak); `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.
6. Integration test — her iki endpoint için pozitif senaryo + `assets` için geçersiz `assetClass` → `400 VALIDATION_ERROR`.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `app/api/asset-classes/route.ts` (+`.test.ts`), `app/api/assets/route.ts` (+`.test.ts`), `lib/services/reference-data-service.ts` (+`.test.ts`), `lib/repositories/asset-class-repository.ts`, `lib/repositories/asset-repository.ts` |
| Güncelle | — |
| Dokunma | `comparison`/`series` endpoint'i (İterasyon 2–3), ortak middleware (İterasyon 5) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Response envelope `{data,meta}` | `docs/03` §2 | Her route handler aynı şekli üretir |
| `asset-classes` cache 86400 | `docs/03` §5.1 | `Cache-Control` header route'ta |
| `assets` cache 3600/86400 SWR | `docs/03` §5.1 | `Cache-Control` header |
| Route→Service→Repository, repo Prisma tipini sızdırmaz | `docs/04` §1, `.claude/rules/10-backend-architecture.md` | Repository düz TS nesnesi döner |
| `snake_case` DB → `camelCase` JSON | `docs/02` vs `docs/03` §5.1 örnek | Servis katmanında mapping |

**Kalite kapıları:**
- [ ] `GET /api/asset-classes` pozitif test — 4 satır, `sort_order` sıralı
- [ ] `GET /api/assets` pozitif test — filtresiz ve `assetClass` filtreli
- [ ] `GET /api/assets` geçersiz `assetClass` → `400 VALIDATION_ERROR`
- [ ] `apps/web` coverage ilerliyor (Faz 3 sonunda ≥%60 hedefi)

**Bu iterasyonda yok:** `withRateLimit`/`withErrorHandling` merkezi middleware'i (İterasyon 5'te çıkarılır), `comparison`/`series`/`health` endpoint'leri, admin endpoint'leri (Faz 5).

**Risk / dikkat:** Bu iterasyonda route handler kendi basit hata çevrimini yapar (geçici) — İterasyon 5'te `withErrorHandling`'e taşınacağı unutulmamalı, aksi halde kod tekrarı kalıcılaşır. Route handler repository'e doğrudan gitmemeli, her zaman servis üzerinden (`.claude/rules/10-backend-architecture.md` kesin kural).

**Stop:**
- [ ] `pnpm --filter web vitest run app/api/asset-classes app/api/assets`
- [ ] PR/onay → İterasyon 2

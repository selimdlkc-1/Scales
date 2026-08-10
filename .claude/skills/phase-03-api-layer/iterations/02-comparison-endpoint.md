### İterasyon 2 — Karşılaştırma Tablosu Endpoint'i (§3.2)

**Hedef:** `GET /api/comparison` çalışır — `real-return.ts` entegrasyonu, `docs/03_API_CONTRACTS.md §5.2` response şekli birebir.

**Teslim çıktısı:**
- `apps/web/app/api/comparison/route.ts`
- `apps/web/lib/services/comparison-service.ts`
- `apps/web/lib/repositories/asset-price-repository.ts`, `cpi-repository.ts`

**Önkoşullar:**
- [ ] İterasyon 1 Stop tamam
- [ ] `feat/comparison-endpoint` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §3.2 — iterasyon kapsamı
2. `docs/03_API_CONTRACTS.md` §5.2 — `/api/comparison` tam contract (query, response, cache)
3. `docs/01_DOMAIN_MODEL.md` §6 — `real_return` formülü, `packages/core` tüketim kuralı (tek kaynak)
4. `docs/01_DOMAIN_MODEL.md` §4 madde 3 — hesaplanabilirlik koşulu (eksik veri → "unavailable", tahmini üretilmez)

**Uygulama planı:**
1. `lib/repositories/asset-price-repository.ts` — dönem başı/sonu fiyat sorgusu (`docs/02` §4 `asset_id`+`as_of_date DESC` index kullanımı).
2. `lib/repositories/cpi-repository.ts` — dönem başı/sonu ayına en yakın `CpiIndex` kaydını bulan sorgu.
3. `lib/services/comparison-service.ts` — her varlık (query'deki `assets` listesi veya tüm aktifler) için start/end fiyat + start/end CPI bul; eksikse `status='unavailable'` (`docs/01` §4 madde 3, tahmini üretilmez), doluysa `packages/core`'daki `calculateNominalReturn`/`calculateRealReturn`'ü çağır; `sortBy`/`sortDir` uygula.
4. `app/api/comparison/route.ts` — query şemasıyla (Faz 1 `comparison-query.ts`) parse, servisi çağır, `{period, rows}` data + envelope + `assetClass` bazlı `Cache-Control` (crypto içeriyorsa `max-age=300`, yoksa `max-age=3600`, `docs/03` §5.2).
5. Integration test — dolu veri (`status=ok` satırı), eksik veri (`status=unavailable` satırı, diğer alanlar `null`), `sortBy`/`sortDir`, geçersiz `period` → `400 INVALID_PERIOD`.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `app/api/comparison/route.ts` (+`.test.ts`), `lib/services/comparison-service.ts` (+`.test.ts`), `lib/repositories/asset-price-repository.ts`, `lib/repositories/cpi-repository.ts` |
| Güncelle | — |
| Dokunma | `series` endpoint'i (İterasyon 3 — aynı repository'leri yeniden kullanır) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| `nominalReturn`/`realReturn` string döner | `docs/03` §1, §5.2 | `Decimal.toString()`, asla `number` |
| `status=unavailable` → diğer alanlar `null` | `docs/03` §5.2 örnek | Eksik veri guard, `packages/core` `null` dönüşü |
| `sortBy`/`sortDir` | `docs/03` §5.2 | Servis katmanında sıralama |
| Crypto içerince kısa cache | `docs/03` §5.2 | Route'ta `assetClass` kontrolü sonrası header seçimi |
| `real-return.ts` tek kaynak | `docs/01` §6 kural | Servis `packages/core`'u import eder, kendi hesap yapmaz |

**Kalite kapıları:**
- [ ] Pozitif: dolu veri satırı doğru nominal/real getiri
- [ ] Eksik veri → `status=unavailable`, diğer alanlar `null` (`docs/08` §4 satır 1'in API karşılığı)
- [ ] Geçersiz `period` → `400 INVALID_PERIOD`
- [ ] `sortBy`/`sortDir` doğrulanmış

**Bu iterasyonda yok:** `series` endpoint'i (İterasyon 3), `health` (İterasyon 4), merkezi middleware (İterasyon 5).

**Risk / dikkat:** `real-return.ts`'in `packages/core` dışında yeniden implemente edilmemesi kesin kural (`docs/01` §6) — servis katmanı yalnızca import eder. Dönem (`1m`/`3m`/`1y`/`3y`/`5y`) → gerçek takvim tarihi çevrimi burada netleşir, İterasyon 3'te tutarlı kullanılmalı.

**Stop:**
- [ ] `pnpm --filter web vitest run app/api/comparison`
- [ ] PR/onay → İterasyon 3

### İterasyon 3 — Grafik Endpoint'i (§3.3)

**Hedef:** `GET /api/comparison/series` çalışır — `normalized-return.ts` entegrasyonu, 2–5 varlık kısıtı (`InvalidAssetSelectionError`).

**Teslim çıktısı:**
- `apps/web/app/api/comparison/series/route.ts`
- `apps/web/lib/services/series-service.ts`
- `packages/core/src/errors.ts` (domain exception hiyerarşisi, ilk kez burada yazılır)

**Önkoşullar:**
- [ ] İterasyon 2 Stop tamam
- [ ] `feat/comparison-series-endpoint` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §3.3 — iterasyon kapsamı
2. `docs/03_API_CONTRACTS.md` §5.2 — `/api/comparison/series` tam contract
3. `docs/01_DOMAIN_MODEL.md` §6 — `normalized_return` formülü
4. `docs/04_BACKEND_SPEC.md` §6 — domain exception hiyerarşisi tablosu (`InvalidAssetSelectionError` dahil)

**Uygulama planı:**
1. `packages/core/src/errors.ts` — `ValidationError`, `AssetNotFoundError`, `InvalidAssetSelectionError`, `UnauthorizedError` sınıfları (`docs/04` §6 tablosu birebir; hepsi bu iterasyonda bir kerede tanımlanır çünkü ortak error taxonomy).
2. `lib/services/series-service.ts` — `assets` listesini parse et (virgülle ayrılmış); sayı 2'den az veya 5'ten fazlaysa `InvalidAssetSelectionError` fırlat.
3. Her varlık için `normalized-return.ts` çağrılarak dönem başını 100 kabul eden endeksli seri üret (İterasyon 2'deki `asset-price-repository.ts` yeniden kullanılır).
4. `app/api/comparison/series/route.ts` — query parse, servisi çağır, `{period, series}` data + İterasyon 2 ile aynı cache politikası.
5. Integration test — 2 ve 5 varlık (sınır değerleri, geçerli), 1 ve 6 varlık (deny → `400 INVALID_ASSET_SELECTION`), geçersiz sembol.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `app/api/comparison/series/route.ts` (+`.test.ts`), `lib/services/series-service.ts` (+`.test.ts`), `packages/core/src/errors.ts` (+`.test.ts`) |
| Güncelle | — |
| Dokunma | `lib/services/comparison-service.ts` (İterasyon 2, değiştirilmez), `health` endpoint'i (İterasyon 4) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| 2–5 varlık kısıtı | `docs/03` §3 `INVALID_ASSET_SELECTION`, `docs/04` §6 | Servis katmanında sayım kontrolü, `throw InvalidAssetSelectionError` |
| `normalized_return` formülü | `docs/01` §6 | `packages/core` import, yeniden yazılmaz |
| Domain exception hiyerarşisi | `docs/04` §6 tablosu | `packages/core/src/errors.ts`; merkezi `withErrorHandling` henüz yok — route `try/catch` ile map eder (İterasyon 5'te merkezileşir) |

**Kalite kapıları:**
- [ ] 2 ve 5 varlık (sınır değerleri) → `200`, seri doğru
- [ ] 1 ve 6 varlık → `400 INVALID_ASSET_SELECTION` (`docs/08` §4 "6. varlık ile grafik isteği" deny senaryosu)
- [ ] `normalized_return[period_start]=100` doğrulanmış

**Bu iterasyonda yok:** `health` endpoint'i, merkezi middleware zinciri (İterasyon 5).

**Risk / dikkat:** `errors.ts` bu iterasyonda ilk kez yazılıyor ama İterasyon 1–2'deki route'lar zaten kendi ad-hoc hata çevrimini yapmıştı — İterasyon 5'te hepsi `errors.ts` + `withErrorHandling`'e taşınacak; bu iterasyonda geriye dönük İterasyon 1–2'yi refactor etmek **kapsam dışıdır** (İterasyon 5'in işi).

**Stop:**
- [ ] `pnpm --filter web vitest run app/api/comparison/series`
- [ ] PR/onay → İterasyon 4

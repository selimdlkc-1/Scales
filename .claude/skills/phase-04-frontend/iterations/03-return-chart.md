### İterasyon 3 — Normalize Edilmiş Getiri Grafiği (§4.3)

**Hedef:** `ReturnChart` (Recharts, `next/dynamic` ile lazy-load) + `AssetSelector` (2–5 varlık kısıtı) çalışır.

**Teslim çıktısı:**
- `components/comparison/{return-chart,asset-selector}.tsx`
- `lib/fetchers/series-fetcher.ts`

**Önkoşullar:**
- [ ] İterasyon 2 Stop tamam
- [ ] `feat/return-chart` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §4.3 — iterasyon kapsamı
2. `docs/05_FRONTEND_SPEC.md` §5, §9 — form kalıbı (5. seçimden sonra disabled), bundle bütçesi/`next/dynamic` lazy-load
3. `docs/06_SCREEN_CATALOG.md` §4 — grafik varlık seçimi alanı, "6. varlık eklemeye çalışma" aksiyonu
4. `docs/03_API_CONTRACTS.md` §5.2 — `/api/comparison/series` response şekli

**Uygulama planı:**
1. `lib/fetchers/series-fetcher.ts` — `fetch('/api/comparison/series?...')` sarmalayıcı.
2. `components/comparison/asset-selector.tsx` — arama yapılabilir çoklu seçim dropdown, min 2 maks 5; 5. seçimden sonra diğer seçenekler `disabled` (`docs/05` §5, `docs/06` §4); 6. seçim denemesinde tooltip *"En fazla 5 varlık karşılaştırabilirsiniz."* (`docs/06` §4 TR mesaj).
3. `components/comparison/return-chart.tsx` — Recharts `LineChart`, `normalized_return` serisi; `next/dynamic` ile lazy-load (`ssr:false`, `docs/05` §9); `aria-label="Seçilen varlıkların normalize edilmiş getiri grafiği"` (`docs/05` §8 a11y).
4. `app/page.tsx`'e `AssetSelector`+`ReturnChart` entegrasyonu — grafik hiçbir varlık seçilmemişse gösterilmez (`docs/06` §4 alan listesi).
5. Recharts import'unun `next/dynamic` ile statik import'a girmediğini doğrula (`docs/05` §9 — ilk yük <250KB hedefi).

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `components/comparison/{return-chart,asset-selector}.tsx`, `lib/fetchers/series-fetcher.ts` |
| Güncelle | `app/page.tsx` (grafik entegrasyonu) |
| Dokunma | Ortak `DataState` (İterasyon 4), Playwright (İterasyon 5) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| 2–5 varlık min/max, 5.den sonra disabled | `docs/05` §5, `docs/06` §4 | `AssetSelector` UI kısıtı (backend `INVALID_ASSET_SELECTION` yalnızca elle URL manipülasyonu için güvenlik ağı) |
| Recharts `next/dynamic` lazy-load | `docs/05` §9 | `dynamic(() => import(...), { ssr: false })` |
| Grafiğe `aria-label` | `docs/05` §8 | `aria-label` attribute |
| Grafik verisi tabloda da mevcut | `docs/05` §8 | Ekran okuyucu tabloya erişebilir, grafik salt görsel tekrar |

**Kalite kapıları:**
- [ ] 6. varlık seçimi engellenir, tooltip gösterilir
- [ ] Recharts bundle'a `next/dynamic` ile giriyor (ilk yük bundle kontrolü)
- [ ] Grafik `aria-label` taşıyor
- [ ] `normalized_return[period_start]=100` grafik ilk noktasında doğru render ediliyor

**Bu iterasyonda yok:** Ortak `DataState` bileşeni, `S-404`/`S-500` (İterasyon 4), Playwright (İterasyon 5).

**Risk / dikkat:** Recharts'ı yanlışlıkla statik import etmek ilk bundle'ı şişirir (LCP/JS bundle hedefleri, `docs/05` §9) — `next/dynamic` zorunlu.

**Stop:**
- [ ] `pnpm --filter web dev`, manuel: 2–5 varlık seçimi + grafik render
- [ ] PR/onay → İterasyon 4

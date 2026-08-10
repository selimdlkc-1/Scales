### İterasyon 2 — Karşılaştırma Tablosu (§4.2)

**Hedef:** `ComparisonTable` (TanStack Table) + `PeriodSelector` + varlık sınıfı filtresi çalışır; filtre durumu URL query'de senkron.

**Teslim çıktısı:**
- `components/comparison/{comparison-table,period-selector,asset-class-filter}.tsx`
- `lib/fetchers/comparison-fetcher.ts`, `lib/format.ts`
- `app/page.tsx` güncellemesi (Server Component ilk yükleme + client filtre)

**Önkoşullar:**
- [ ] İterasyon 1 Stop tamam
- [ ] `feat/comparison-table` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §4.2 — iterasyon kapsamı
2. `docs/05_FRONTEND_SPEC.md` §2–4 — URL query state, state yönetimi sınırı, veri çekme kalıbı
3. `docs/06_SCREEN_CATALOG.md` §4 (S-HOME) — alan listesi, aksiyonlar, UX state'leri, TR mesajlar
4. `docs/03_API_CONTRACTS.md` §5.1–5.2 — `assets`/`comparison` response şekli (tüketilecek)

**Uygulama planı:**
1. `lib/format.ts` — `Intl.NumberFormat('tr-TR', ...)` ve `Intl.DateTimeFormat('tr-TR', ...)` merkezi yardımcılar (`docs/05` §10).
2. `lib/fetchers/comparison-fetcher.ts` — client-side `fetch('/api/comparison?...')` sarmalayıcı, 1 kez otomatik retry (`docs/03` §7, `docs/05` §4).
3. `components/comparison/period-selector.tsx` — segmented control 1A/3A/1Y/3Y/5Y, varsayılan 1Y (`docs/06` §4).
4. `components/comparison/asset-class-filter.tsx` — çoklu seçim checkbox grubu (Döviz/Altın/Kripto/Yatırım Fonu).
5. `components/comparison/comparison-table.tsx` — TanStack Table; kolon başlığına tıklama **client-side** sıralama (`docs/06` §4 — ek API çağrısı gerekmez); `status="unavailable"` satırlar gri + "Veri yok", sıralamanın en altında (`docs/06` §4); pozitif/negatif getiri hem renk hem `+`/`-` işaretiyle (`docs/05` §8 a11y).
6. `app/page.tsx` — Server Component ilk yükleme (varsayılan `period=1y`, tüm aktif varlıklar, servis katmanından doğrudan — HTTP round-trip yok, `docs/05` §4); filtre değişikliği client component'e devredilir (`useState` + `useSearchParams` + `router.replace(..., { scroll: false })`).
7. URL query senkronizasyonu — `assets`, `period`, `sortBy`, `sortDir` (`docs/05` §2). Loading/error bu iterasyonda **basit/inline** ele alınır — İterasyon 4'te ortak `DataState`'e refactor edilecek.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `components/comparison/{comparison-table,period-selector,asset-class-filter}.tsx`, `lib/fetchers/comparison-fetcher.ts`, `lib/format.ts` |
| Güncelle | `app/page.tsx` |
| Dokunma | `ReturnChart`/`AssetSelector` (İterasyon 3), ortak `DataState` (İterasyon 4) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| URL query state (`assets`,`period`,`sortBy`,`sortDir`) | `docs/05` §2 | `useSearchParams` + `router.replace(scroll:false)` |
| Server state değil, filtre client state | `docs/05` §3 | `useState`/URL, global state kütüphanesi yok |
| Kolon tıklama = client-side sıralama | `docs/06` §4 | TanStack Table state, ek fetch yok |
| `status=unavailable` gri + "Veri yok" | `docs/06` §4 UX state | Tablo satır render koşulu |
| `+`/`-` işareti renk yanında | `docs/05` §8 a11y | Inline işaret/`StatusBadge` |

**Kalite kapıları:**
- [ ] Server Component ilk yükleme HTTP round-trip yapmıyor (servis katmanından doğrudan)
- [ ] Filtre değişikliği URL'i günceller, geri/ileri navigasyon çalışır
- [ ] `status=unavailable` satırları doğru render (gri, "Veri yok", en altta)
- [ ] Kolon sıralama client-side, ek network isteği yok
- [ ] a11y: Tab/Enter/Space ile tüm kontroller erişilebilir

**Bu iterasyonda yok:** `ReturnChart`, `AssetSelector` (İterasyon 3), ortak `DataState` wrapper'ı (İterasyon 4 — bu iterasyonda basit inline loading/error kullanılır), Playwright e2e (İterasyon 5).

**Risk / dikkat:** Composite component'ler kendi fetch'ini yapmamalı (`.claude/rules/24-frontend-components.md`) — fetch page/container seviyesinde, `ComparisonTable` yalnızca props alır.

**Stop:**
- [ ] `pnpm --filter web dev`, manuel: filtre değişince tablo güncelleniyor, URL senkron
- [ ] PR/onay → İterasyon 3

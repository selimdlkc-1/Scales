### İterasyon 4 — Durum Yönetimi ve Hata Ekranları (§4.4)

**Hedef:** `DataState` ortak bileşeni (loading/error/empty/success) çıkarılır ve İterasyon 2–3'teki inline durumlar buna refactor edilir; `S-404`, `S-500` ekranları eklenir (`docs/06_SCREEN_CATALOG.md §5`).

**Teslim çıktısı:**
- `components/ui/data-state.tsx`
- `app/not-found.tsx` (S-404), `app/error.tsx` (S-500)
- `app/page.tsx` içindeki İterasyon 2–3 inline durumlarının `DataState`'e taşınmış hali

**Önkoşullar:**
- [ ] İterasyon 2–3 Stop tamam
- [ ] `refactor/data-state-error-screens` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §4.4 — iterasyon kapsamı
2. `docs/06_SCREEN_CATALOG.md` §5–6 — `S-404`/`S-500` kısa şablon, `DataState` ortak bileşen tanımı
3. `docs/05_FRONTEND_SPEC.md` §4 — loading/error/empty standardı

**Uygulama planı:**
1. `components/ui/data-state.tsx` — `loading` (skeleton), `error` (kırmızı banner + "Tekrar dene" butonu; **önceki veri varsa ekranda kalır, tamamen boşalmaz**), `empty` (*"Bu dönem için veri bulunamadı."*, `docs/06` §4), `success` (children render) — 4 durumu discriminated union/prop ile yönetir.
2. `app/page.tsx` + `comparison-table`/`return-chart` entegrasyonundaki (İterasyon 2–3) inline loading/error kodu `DataState`'e refactor edilir.
3. `app/not-found.tsx` (S-404) — *"Aradığınız sayfa bulunamadı."* + "Ana sayfaya dön" linki (`/`).
4. `app/error.tsx` (S-500) — *"Bir şeyler ters gitti. Lütfen tekrar deneyin."* + "Sayfayı yenile" butonu (Next.js `reset()` çağrısı).
5. Regresyon: İterasyon 2–3'ün filtre/grafik akışı `DataState` sonrası hâlâ doğru çalışıyor mu manuel/otomatik kontrol.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `components/ui/data-state.tsx`, `app/not-found.tsx`, `app/error.tsx` |
| Güncelle | `app/page.tsx` (İterasyon 2–3 inline durumları `DataState`'e taşınır) |
| Dokunma | Admin panelinde `DataState` kullanımı (Faz 5 §5.2 — bu bileşen orada yeniden kullanılacak) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| loading/error/empty/success ortak wrapper | `docs/06` §6, `docs/05` §4 | `data-state.tsx` tek noktadan, her yeni ekran ad-hoc yazmaz |
| S-404 metni | `docs/06` §5 | *"Aradığınız sayfa bulunamadı."* |
| S-500 metni + `reset()` | `docs/06` §5 | *"Bir şeyler ters gitti..."* + Next.js `error.tsx` `reset()` |
| Hata durumunda önceki veri kalır | `docs/06` §4 UX state | `error` durumu children'ı unmount etmez, banner üstte |

**Kalite kapıları:**
- [ ] `DataState` 4 durumu doğru render (loading/error/empty/success) — component testi
- [ ] `S-404`/`S-500` render + linkler çalışıyor
- [ ] Regresyon: İterasyon 2–3 filtre/grafik akışı `DataState` sonrası hâlâ çalışıyor
- [ ] a11y: hata banner'ı ve butonlar klavye erişilebilir

**Bu iterasyonda yok:** Admin ekranı (`S-OPERATOR-PANEL`, Faz 5 §5.2 — `DataState` orada yeniden kullanılacak), Playwright e2e (İterasyon 5).

**Risk / dikkat:** `DataState`'e refactor ederken İterasyon 2–3'teki mevcut davranışın (örn. hata sırasında önceki verinin kalması) kaybolmaması gerekir — "tüm tablo kaybolmaz" kuralı (`docs/05` §4) `DataState` tasarımında korunmalı.

**Stop:**
- [ ] `pnpm --filter web dev`, manuel: loading/error/empty durumları tetikle (network throttle/mock)
- [ ] PR/onay → İterasyon 5

### İterasyon 2 — Operatör Paneli Ekranı (§5.2)

**Hedef:** `S-OPERATOR-PANEL` çalışır — `JobRunTable`, `SourceHealthCard`, `/admin` altındaki tüm sayfalar Next.js Middleware ile korunuyor.

**Teslim çıktısı:**
- `apps/web/middleware.ts`
- `app/admin/layout.tsx`, `app/admin/page.tsx`
- `components/admin/{job-run-table,source-health-card}.tsx`
- `components/ui/status-badge.tsx`
- `e2e/admin-panel-access.spec.ts`

**Önkoşullar:**
- [ ] İterasyon 1 Stop tamam
- [ ] Faz 4 Done Definition tamam (`DataState` bileşeni hazır, yeniden kullanılacak)
- [ ] `feat/operator-panel-screen` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §5.2 — iterasyon kapsamı
2. `docs/06_SCREEN_CATALOG.md` §4 — `S-OPERATOR-PANEL` tam şablon (alan listesi, aksiyonlar, UX state'leri, TR mesajlar)
3. `docs/05_FRONTEND_SPEC.md` §2 — middleware koruma mekanizması
4. `docs/07_SECURITY_IMPLEMENTATION.md` §2 — login akışı sequence (middleware→API aynı header)

**Uygulama planı:**
1. `apps/web/middleware.ts` — `matcher: ['/admin/:path*']`, `Authorization: Basic` kontrolü (İterasyon 1'deki `with-admin-auth` mantığıyla **aynı** env var karşılaştırması, **ayrı bağımsız implementasyon** — `docs/07` §4 defense in depth).
2. `app/admin/layout.tsx` — sade operatör kabuğu ("Terazi — Operatör Paneli" başlığı), kullanıcı navigasyonu/`DisclaimerFooter` içermez (`docs/06` §2).
3. `components/ui/status-badge.tsx` — renk+metin kombinasyonu (*Başarılı*/*Kısmi Başarı*/*Hata*/*Bekliyor*/*Çalışıyor*, `docs/05` §8 — renk tek başına anlam taşımaz).
4. `components/admin/source-health-card.tsx` — 3 kart (TCMB/TEFAS/CoinGecko), `isStale=true` → turuncu kenarlık vurgusu (`docs/06` §4).
5. `components/admin/job-run-table.tsx` — kaynak/durum/başlangıç-bitiş/kayıt sayısı/hata mesajı kolonları, en yeni çalıştırma en üstte.
6. `app/admin/page.tsx` — Server Component, `admin-service` üzerinden ilk veri + kaynak filtresi (client, `dataSource` query param); loading/error/empty **Faz 4'teki `DataState`** ile ele alınır (ad-hoc yazılmaz, `.claude/rules/24-frontend-components.md`).
7. `e2e/admin-panel-access.spec.ts` — Basic Auth olmadan `/admin` → 401 diyaloğu; doğru credential ile gir → job tablosu görünür (`docs/08` §6, 4. journey — bu iterasyonda eklenir).

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `apps/web/middleware.ts`, `app/admin/layout.tsx`, `app/admin/page.tsx`, `components/admin/{job-run-table,source-health-card}.tsx`, `components/ui/status-badge.tsx`, `e2e/admin-panel-access.spec.ts` |
| Güncelle | — |
| Dokunma | `app/api/admin/*` (İterasyon 1, değişmez) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| `/admin` middleware koruması | `docs/05` §2, `docs/07` §4 | `middleware.ts` matcher + `Authorization` kontrolü |
| `DataState` yeniden kullanımı | `docs/06` §6, Faz 4 §4.4 | Admin sayfası kendi ad-hoc loading/error yazmaz |
| `StatusBadge` renk+metin | `docs/05` §8 | Renk tek başına anlam taşımaz |
| `isStale` turuncu vurgu | `docs/06` §4 | `SourceHealthCard` kenarlık koşulu |
| Operatör paneli journey | `docs/08` §6 | `e2e/admin-panel-access.spec.ts` |

**Kalite kapıları:**
- [ ] Auth'suz `/admin` → `401` diyaloğu (middleware testi/e2e)
- [ ] Doğru credential → sayfa render, `JobRunTable`+`SourceHealthCard` dolu
- [ ] `DataState` admin sayfasında yeniden kullanılmış (kopya kod yok)
- [ ] Playwright: operatör paneli journey'i yeşil

**Bu iterasyonda yok:** HTTP güvenlik başlıkları sertleştirmesi (İterasyon 3), dependency taraması (İterasyon 4).

**Risk / dikkat:** `middleware.ts` ve İterasyon 1'deki `withAdminAuth`'un aynı env var'ı karşılaştırdığından ama farklı istek yaşam döngülerinde çalıştığından emin olunmalı — biri güncellenirken diğeri unutulmamalı (`docs/05` §2 notu).

**Stop:**
- [ ] `pnpm --filter web dev`, manuel: `/admin` auth'suz→401 diyalog, doğru credential→panel
- [ ] `pnpm --filter web exec playwright test e2e/admin-panel-access.spec.ts`
- [ ] PR/onay → İterasyon 3

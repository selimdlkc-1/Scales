---
name: phase-04-frontend
description: '[Faz 4] Frontend — 5 iterasyon/chat (kök layout+tasarım temeli → karşılaştırma tablosu → getiri grafiği → durum yönetimi+hata ekranları → smoke e2e). Use when the user says "Faz 4", "Faz 4 — İterasyon N", or asks to build S-HOME, the ComparisonTable, ReturnChart, AssetSelector, DataState, S-404/S-500 screens, or Playwright smoke tests. Do NOT use for the API endpoints this phase consumes (Faz 3), the admin screen S-OPERATOR-PANEL (Faz 5), or worker/backend code.'
---

# Faz 4: Frontend

## Goal

`apps/web`'de S-HOME ekranını (`docs/06_SCREEN_CATALOG.md`) uçtan uca kurmak: Tailwind/shadcn temeli, karşılaştırma tablosu, normalize getiri grafiği, ortak durum yönetimi (loading/error/empty) ve hata ekranları (S-404/S-500), son iterasyonda Playwright smoke e2e testleri. Detay: `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 4.

## Feature branch (zorunlu)

Her iterasyon kendi `§4.M` alt maddesine karşılık gelir — `git-phase-branch` skill'i **her iterasyon başında ayrı** çalıştırılır:

| İterasyon | Branch |
| --- | --- |
| 1 (§4.1) | `feat/root-layout-design-foundation` |
| 2 (§4.2) | `feat/comparison-table` |
| 3 (§4.3) | `feat/return-chart` |
| 4 (§4.4) | `refactor/data-state-error-screens` |
| 5 (§4.5) | `test/e2e-smoke` |

## Bu fazın çalışma modeli

- Tek sohbet fazı bitirmez — her chat başında **「Faz 4 — İterasyon M」** belirt.
- Agent **yalnızca çalıştığı iterasyonun dosyasını okur** — `iterations/0M-*.md`.
- Plan moduna geçme — iterasyon dosyası yeterli.
- **Sıralama notu:** İterasyon 2–3'te loading/error basit/inline ele alınır; İterasyon 4 bunları ortak `DataState` bileşenine refactor eder (Faz 2/3'teki "önce bireysel, sonra ortaklaştır" deseniyle tutarlı, `docs/10` §4.4).

## İterasyon indeksi

| # | Teslim | Dosya |
| --- | --- | --- |
| 1 | Kök layout + Tailwind/shadcn kurulumu + `DisclaimerFooter` | `iterations/01-root-layout-design-foundation.md` |
| 2 | `ComparisonTable` + `PeriodSelector` + sınıf filtresi, URL query state | `iterations/02-comparison-table.md` |
| 3 | `ReturnChart` (Recharts, lazy-load) + `AssetSelector` (2–5 kısıt) | `iterations/03-return-chart.md` |
| 4 | `DataState` ortak bileşeni (refactor), `S-404`, `S-500` | `iterations/04-data-state-error-screens.md` |
| 5 | Playwright smoke e2e — 3 kritik journey | `iterations/05-e2e-smoke.md` |

> Yalnızca çalıştığın iterasyonun dosyasını oku.

## Required Context

- `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 4 (§4.1–§4.5) — faz geneli
- `.claude/rules/20-frontend-architecture.md`, `24-frontend-components.md`, `35-testing.md`, `04-quality-gates.md` — zaten yüklü (path-scoped/koşulsuz), tekrar edilmez

## Done Definition

- [ ] S-HOME (`docs/06` §4) tüm alan/aksiyon/UX state'leriyle çalışır
- [ ] Filtre durumu URL query'de tutulur, global state kütüphanesi yok
- [ ] `DisclaimerFooter` her sayfada, ad-hoc kopyalanmamış
- [ ] a11y minimumları (`docs/05` §8: klavye erişimi, `+`/`-` işareti, WCAG AA kontrast) karşılanır
- [ ] Bundle <250KB ilk yük, Recharts/TanStack Table `next/dynamic` ile lazy-load
- [ ] 3 Playwright journey yeşil (`docs/08` §6)

## Explicit Don'ts

- `S-OPERATOR-PANEL`/`/admin` ekranı (Faz 5 §5.2)
- Yeni bir global state kütüphanesi (Redux/Zustand) veya client cache kütüphanesi (TanStack Query/SWR) eklemek — URL + `useState` yeterli (`docs/05` §3)
- API route/servis kodu değiştirme (Faz 3 tamamlanmış kabul edilir)
- Karanlık mod eklemek (`docs/05` §7, v1 kapsamı dışı)

---
Faz bitti → `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 4 işareti.

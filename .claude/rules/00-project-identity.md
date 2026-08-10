# Terazi — Proje Kimliği

Terazi; döviz (USD/TRY, EUR/TRY), gram altın, kripto (BTC, ETH, SOL, BNB, XRP) ve TEFAS yatırım fonlarının TL bazında, TÜFE ile enflasyondan arındırılmış **reel getirisini** karşılaştıran, **read-only, hesapsız** bir vitrin/portföy projesidir. Öncelik ölçeklenebilirlik değil **veri katmanı kalitesi** ([P-004]) — idempotent job'lar, retry/backoff, graceful degradation, gerçek unit test.

Yatırım tavsiyesi verilmez ([P-006]): hiçbir ekranda "al/sat/iyi seçenek/önerilir" ifadesi veya sıralama-bazlı öneri üretilmez; her ekranda sabit uyarı bulunur.

## Tech Stack (Pin'li)

- TypeScript uçtan uca (frontend, backend, worker, paylaşılan kod) — [TS-001]
- Next.js (App Router) + Tailwind CSS + shadcn/ui — [TS-002]
- Düz REST, Next.js API routes; versiyonlama yok — [TS-003]
- Ayrı Node.js worker process, cron-tetiklemeli — [TS-004]
- pnpm workspaces monorepo — [TS-005]
- PostgreSQL 16+ + Prisma; parasal alanlar daima `DECIMAL`/`NUMERIC`, asla `float` — [TS-006]
- Zod (API query + dış kaynak yanıt doğrulama, tek şema kaynağı) — [TS-007]
- Recharts (grafik) + TanStack Table (tablo) — [TS-008]
- Node.js 22 LTS, React 19, Prisma 5+

Yeni framework/kütüphane eklemek → önce `docs/mimari-kararlar.md` güncellenir (ADR, bkz. `write-adr` skill).

## Monorepo Yapısı

```
apps/
  web/        # Next.js (App Router) — app/api, lib/services, lib/repositories
  worker/     # veri toplama job'ları (tcmb, tefas, coingecko)
packages/
  core/       # hesaplama fonksiyonları, Zod şemaları, Prisma client
```

Detay: `docs/mimari-kararlar.md` [CODE-002], `docs/04_BACKEND_SPEC.md §2`.

## Domain Terminolojisi

| Terim | Kod | Anlam |
| --- | --- | --- |
| Reel getiri | `real_return` | Nominalin TÜFE arındırılmış hali |
| Nominal getiri | `nominal_return` | Fiyat değişiminden hesaplanan ham getiri |
| Varlık sınıfı | `asset_class` | Döviz/altın/kripto/fon üst kategorisi |
| Varlık | `asset` | Tekil enstrüman (USD/TRY, BTC, bir TEFAS fonu) |
| Normalize edilmiş getiri | `normalized_return` | Dönem başını 100 kabul eden endeks |
| Veri tarihi | `as_of_date` | Veri noktasının ait olduğu gerçek tarih |
| Dönem | `period` | `1m`/`3m`/`1y`/`3y`/`5y` |

Farklı isimlendirme (`yield`/`instrument` vb.) tutarsızlık sayılır.

## MVP Kapsamı Dışı

Kullanıcı hesabı/auth/rol, portföy takibi, BIST hisse, bildirim/alarm, canlı fiyat push/polling, al/sat sinyali, i18n, native mobil, üçüncü parti analytics/error-tracking ([P-008]). Bunlardan biri istenirse önce `docs/mimari-kararlar.md` güncellenir.

---
Detay: `docs/00_PROJECT_OVERVIEW.md`, `docs/01_DOMAIN_MODEL.md §1`, `docs/mimari-kararlar.md` §1, §14

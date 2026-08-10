# Kalite Kapıları

## Coverage eşikleri ([TEST-002])

| Katman | Hedef |
| --- | --- |
| `packages/core` (hesaplama + şemalar) | **%90+** |
| `apps/web` (routing, servis, repository) | **%60+** |
| `apps/worker` (job, client, servis) | **%60+** |

`vitest --coverage` (v8 provider) ile ölçülür; eşiğin altına düşen PR merge edilemez. Kritik modüller (`calculations/real-return.ts`, `calculations/normalized-return.ts`, `schemas/external/*.ts`, `apps/worker/src/jobs/*.ts`) her yeni fonksiyonda bu eşiği korumak zorundadır ([CODE-001] madde 5).

## CI Gate ([INF-002], sıra bağlayıcı)

1. **Lint** (ESLint + Prettier) — hata varsa pipeline durur.
2. **Test** (Vitest unit + integration, coverage eşikleriyle) — kırmızı test veya eşik altı coverage pipeline'ı durdurur.
3. **Build** (`pnpm build`, hem `apps/web` hem `apps/worker`).
4. **Dependency taraması** (Dependabot + `npm audit`/pnpm eşdeğeri) — kritik/yüksek zafiyet build'i bloklamaz ama uyarır ([SEC-008]).

Playwright smoke e2e ayrı bir CI job'udur, build'i bloklamaz ama main'e merge öncesi yeşil olması beklenir. **CI yeşilliği tek başına merge onayı değildir** ([TEST-005]) — bkz. `01-coding-philosophy.md`.

## Zorunlu negatif/deny senaryoları

Her PR'da en az bir test: sıfır/eksik başlangıç fiyatı (null döner, exception yok), bozuk dış kaynak yanıtı (`partial` durum), geçersiz `period`/`assetClass` (`400`), 6. varlık ile grafik isteği (`400 INVALID_ASSET_SELECTION`), auth'suz admin isteği (`401`), rate limit aşımı (`429`), aynı `(asset_id, as_of_date)` için job'un iki kez çalışması (tek satır upsert).

## a11y ve performans eşikleri

- Klavye erişilebilirliği (Tab/Enter/Space) tüm interaktif elemanlarda; renk tek başına anlam taşımaz (`+`/`-` işaretiyle desteklenir); WCAG AA kontrast (4.5:1 metin).
- LCP < 2.5s, INP < 200ms, CLS < 0.1, ilk yük JS bundle < 250KB (Recharts/TanStack Table `next/dynamic` ile lazy-load).

## PR zorunlu kontroller ([CODE-005])

Test yazıldı ve geçiyor · coverage korundu · güvenlik yasak listesine aykırılık yok · mimari karar gerekiyorsa önce docs güncellendi · CI yeşil. PR açıklaması hangi Faz/`§N.M` alt maddesine karşılık geldiğini belirtir.

---
Detay: `docs/08_TESTING_STRATEGY.md` §2-4, §7; `docs/05_FRONTEND_SPEC.md §8-9`; `docs/09_DEV_WORKFLOW.md §3`

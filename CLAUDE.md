# Terazi

> Talimatlar `.claude/rules/` (koşulsuz + path-scoped) ve `.claude/skills/` (görev prosedürleri) altında.
> Bu dosya **yönlendiricidir**. Spec tek doğruluk kaynağı: `docs/`. Çelişkide **docs kazanır**.
>
> ⚠️ Proje henüz Faz 0'ı tamamlamadı — `apps/`, `packages/` klasörleri yok. Aşağıdaki path-scoped rule'lar `docs/mimari-kararlar.md` [CODE-002]'deki planlanan yapıya göre **prospektif** yazıldı; Faz 0 tamamlanınca gerçek dosyalarla yeniden `Glob` doğrulaması yapılmalı (rules-architect'i tekrar çalıştır).

## Çalışma Protokolü

1. Koşulsuz kurallar (`00–04`) her oturumda zaten yüklü — özet aşağıda, tereddütte tam dosyayı oku.
2. Bir dosyayı düzenlemeden önce path tablosundan ilgili rule'ı kontrol et; path-scoped rule dosya okununca otomatik yüklenir.
3. Görev bir prosedürse (endpoint, ekran, veri kaynağı, migration, ADR…) ilgili skill'i çalıştır.
4. Faz çalışmasıysa **önce** `git-phase-branch` ile feature branch aç, sonra ilgili `phase-XX-*` skill'ini çalıştır.
5. Spec detayı için `docs/` path'ine git — talimatlarda kopyalanmış tablo arama.
6. Yeni bir mimari karar gerektiren seçim (kütüphane, kapsam, veri kaynağı) → önce `write-adr`.

## Her Zaman Geçerli — Özet

Tam metin: `.claude/rules/00-*.md` … `04-*.md`

- **[00] Kimlik** — Terazi: read-only, hesapsız, TL bazında reel getiri karşılaştırma; TS + Next.js + Prisma/Postgres monorepo (`apps/web`, `apps/worker`, `packages/core`)
- **[01] Felsefe** — Veri katmanı kalitesi > UI cilası ([P-004]); 1 chat ≈ 1 PR ≈ 1 `§N.M`; onaysız merge yasak
- **[02] Naming** — TR arayüz / EN kod, `kebab-case` dosya, Conventional Commits
- **[03] Güvenlik** — 6 zorunlu kontrol (Zod validation, admin auth sarmalaması, secrets, dış veri doğrulama, parametrik SQL, merkezi header config); skip yasak
- **[04] Kalite** — `packages/core` %90+ / `apps/web`+`apps/worker` %60+ coverage; CI (lint→test→build→dep tarama); a11y/perf eşikleri

## Path Yönlendirme

Bu rule'lar eşleşen dosya okunduğunda otomatik yüklenir (prospektif, bkz. üstteki uyarı).

| Dosya deseni | Rule |
| --- | --- |
| `apps/web/app/api/**`, `apps/web/lib/**`, `apps/worker/src/**`, `packages/core/src/**` | `10-backend-architecture` |
| `apps/web/app/api/**/*.ts` | `14-backend-controllers` |
| `apps/worker/src/**/*.ts` | `15-worker-jobs` |
| `packages/core/prisma/**`, `packages/core/src/prisma/**` | `16-database-prisma` |
| `apps/web/app/**/*.tsx`, `apps/web/lib/fetchers/**`, `apps/web/middleware.ts` | `20-frontend-architecture` |
| `apps/web/components/**/*.tsx` | `24-frontend-components` |
| `apps/**/*.test.ts`, `packages/**/*.test.ts`, `apps/web/e2e/**/*.spec.ts` | `35-testing` |

> Birden fazla desen eşleşebilir (örn. bir controller `10` + `14`) — hepsi geçerli.

## Görev → Skill

| Görev türü | Skill |
| --- | --- |
| Yeni/değişen REST endpoint | `add-new-endpoint` |
| Yeni ekran/route | `add-new-screen` |
| Yeni veri kaynağı / worker job | `add-data-source-job` |
| DB migration | `add-prisma-migration` |
| Yeni/değişen mimari karar | `write-adr` |
| CI/test kırığı | `fix-failing-test` |
| Faz çalışmasına başlarken | `git-phase-branch` |

## Faz Yönlendirme

Mesajda **「Faz N — §N.M」** belirt. Henüz hiçbir faz skill'i üretilmedi.

| Faz | Başlık | Skill |
| --- | --- | --- |
| 0 | Proje İskeleti ve CI | `phase-00-infra-scaffold` |
| 1 | Domain ve Veritabanı | `phase-01-domain-database` |
| 2 | Worker ve Veri Toplama | `phase-02-worker-collectors` |
| 3 | API Katmanı | `phase-03-api-layer` |
| 4 | Frontend | `phase-04-frontend` |
| 5 | Operatör Paneli ve Sertleştirme | `phase-05-operator-hardening` |

Faz skill üretimi: `phase-creator`.

## docs/ — Nihai Kaynak

`docs/mimari-kararlar.md` (karar ID kaynağı) · `docs/00_PROJECT_OVERVIEW.md` · `01_DOMAIN_MODEL.md` · `02_DATABASE_SCHEMA.md` · `03_API_CONTRACTS.md` · `04_BACKEND_SPEC.md` · `05_FRONTEND_SPEC.md` · `06_SCREEN_CATALOG.md` · `07_SECURITY_IMPLEMENTATION.md` · `08_TESTING_STRATEGY.md` · `09_DEV_WORKFLOW.md` · `10_IMPLEMENTATION_ROADMAP.md`

> Spec değişikliği → önce docs güncelle (`write-adr`), sonra ilgili talimat referansını doğrula.

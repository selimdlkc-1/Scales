---
name: phase-00-infra-scaffold
description: '[Faz 0] Proje İskeleti ve CI — 4 iterasyon/chat (monorepo kurulumu → TS/lint config → CI iskeleti → local ortam). Use when the user says "Faz 0", "Faz 0 — İterasyon N", or asks to scaffold the monorepo, set up lint/CI, or prepare the local dev environment. Do NOT use for DB schema/Prisma (Faz 1), worker jobs (Faz 2), API routes (Faz 3), or frontend UI (Faz 4).'
---

# Faz 0: Proje İskeleti ve CI

## Goal

`apps/web`, `apps/worker`, `packages/core` boş paketleriyle çalışan bir pnpm monorepo + ortak TS/lint config + CI iskeleti (`lint`+`build`) + local Postgres ortamı kurmak. Henüz iş mantığı, DB şeması, endpoint veya test coverage gate'i yok — bu faz yalnızca temel. Detay: `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 0.

## Feature branch (zorunlu)

Her iterasyon kendi `§0.M` alt maddesine karşılık gelir — `git-phase-branch` skill'i **her iterasyon başında ayrı** çalıştırılır (`docs/09_DEV_WORKFLOW.md §1`: bir branch birden fazla alt madde karıştırmaz):

| İterasyon | Branch |
| --- | --- |
| 1 (§0.1) | `chore/monorepo-scaffold` |
| 2 (§0.2) | `chore/ts-lint-config` |
| 3 (§0.3) | `chore/ci-skeleton` |
| 4 (§0.4) | `chore/local-env-setup` |

## Bu fazın çalışma modeli

- Tek sohbet fazı bitirmez — her chat başında **「Faz 0 — İterasyon M」** belirt.
- Agent yalnızca o iterasyonun **Docs okuma sırası**nı okur, tüm spec'i değil.
- Plan moduna geçme — aşağıdaki iterasyon blueprint'i yeterli.

## Required Context

- `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 0 (§0.1–§0.4) — faz geneli
- `.claude/rules/00-project-identity.md`, `02-language-naming.md`, `04-quality-gates.md` — zaten yüklü, tekrar edilmez

## Done Definition

- [ ] `pnpm install` kökte hatasız, 3 workspace paketi (`@terazi/web`, `@terazi/worker`, `@terazi/core`) tanınıyor
- [ ] `pnpm -w lint` ve `pnpm -w build` yeşil (boş ama hatasız)
- [ ] GitHub Actions'ta `lint`+`build` job'ları tetikleniyor ve yeşil
- [ ] `docker compose up -d` ile lokal Postgres 16+ ayağa kalkıyor
- [ ] `.env.example`, `docs/04_BACKEND_SPEC.md §10`'daki 7 değişkenin tamamını placeholder ile içeriyor

## Explicit Don'ts

- DB şeması/migration yazma (Faz 1)
- Gerçek Next.js sayfası/route, worker job, hesaplama fonksiyonu yazma — yalnızca boş paket iskeleti
- Test framework (Vitest) kurulumu — Faz 1 §1.4'te CI'a `test` job'uyla birlikte eklenir
- shadcn/ui / Tailwind kurulumu — Faz 4 §4.1

---

## İterasyon 1 — Monorepo Kurulumu (§0.1)

**Hedef:** pnpm workspaces ile `apps/web`, `apps/worker`, `packages/core` boş paket iskeletleri kurulu; `pnpm install` kökte hatasız çalışıyor.

**Teslim çıktısı:**
- Kök `package.json` + `pnpm-workspace.yaml`
- `apps/web/package.json` + minimal `app/layout.tsx`, `app/page.tsx` placeholder
- `apps/worker/package.json` + minimal `src/index.ts`
- `packages/core/package.json` + minimal `src/index.ts` (boş barrel)
- `.gitignore`

**Önkoşullar:**
- [ ] Repo boş (Faz 0 başlamamış) — bu iterasyondan önce `apps/`, `packages/` yok
- [ ] `chore/monorepo-scaffold` branch'i açıldı (`git-phase-branch`)

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §0.1 — iterasyon kapsamı
2. `docs/04_BACKEND_SPEC.md` §2 — klasör ve modül ağacı (birebir oluşturulacak)
3. `.claude/rules/00-project-identity.md` — tech stack pin'leri (TS-001–TS-006), monorepo yapısı

**Uygulama planı:**
1. Kök `package.json` — `"private": true`, `"packageManager": "pnpm@<sürüm>"`, henüz boş `scripts` (İterasyon 2–3'te dolacak).
2. `pnpm-workspace.yaml` — `packages: ['apps/*', 'packages/*']`.
3. `apps/web/package.json` (`name: "@terazi/web"`) — `next`, `react`, `react-dom` bağımlılıkları (`docs/04` §2 App Router yapısı); `app/layout.tsx` ve `app/page.tsx` minimal placeholder ("Terazi" metni) — gerçek layout/tasarım Faz 4 §4.1'de.
4. `apps/worker/package.json` (`name: "@terazi/worker"`) — `src/index.ts` placeholder; `src/jobs/`, `src/clients/`, `src/entrypoints/` klasörleri `.gitkeep` ile (gerçek job'lar Faz 2).
5. `packages/core/package.json` (`name: "@terazi/core"`) — `src/index.ts` boş barrel export; `src/calculations/`, `src/schemas/`, `src/prisma/` klasörleri `.gitkeep` ile (Faz 1'de dolacak).
6. Kökte `pnpm install` çalıştır, üç paketin de tanındığını doğrula.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `apps/web/package.json`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/worker/package.json`, `apps/worker/src/index.ts`, `packages/core/package.json`, `packages/core/src/index.ts` |
| Güncelle | — |
| Dokunma | `tsconfig.*` (İterasyon 2), CI (İterasyon 3), `docker-compose.yml` (İterasyon 4) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Klasör ağacı | `docs/04` §2 | `apps/web/app`, `apps/worker/src/{jobs,clients,entrypoints}`, `packages/core/src/{calculations,schemas,prisma}` birebir |
| pnpm workspaces | `.claude/rules/00-project-identity.md` TS-005 | Kök `pnpm-workspace.yaml` + her paketin kendi `package.json`'ı |
| Next.js App Router pin | `.claude/rules/00-project-identity.md` TS-002 | `apps/web/package.json`'da `next` + React 19 |

**Kalite kapıları:** (scaffold iterasyonu — test yok, aşağıdakiler yeterli)
- [ ] `pnpm install` hatasız
- [ ] `pnpm -w list --depth -1` üç paketi de gösteriyor
- [ ] Lint/type kontrolü henüz yok (İterasyon 2)

**Bu iterasyonda yok:** TS config, ESLint/Prettier, CI, Docker, gerçek Next.js sayfası/route/component.

**Risk / dikkat:** Paket adları (`@terazi/web` vb.) sonraki fazlarda import path'lerini etkiler — burada sabitlenip değiştirilmemeli. Node 22 LTS + pnpm sürümü arasında uyumsuzluk CI'da (İterasyon 3) sorun çıkarabilir, `packageManager` alanı burada doğru sabitlenmeli.

**Stop:**
- [ ] `pnpm install`
- [ ] `pnpm -w list --depth -1`
- [ ] PR/onay → İterasyon 2

---

## İterasyon 2 — Ortak TS/Lint/Format Konfigürasyonu (§0.2)

**Hedef:** Kök `tsconfig.base.json` + ESLint/Prettier kurulu; `CODE-003` naming convention'ları lint kuralına yansımış; her paket kendi `tsconfig.json`'ıyla base'i extend ediyor.

**Teslim çıktısı:**
- `tsconfig.base.json` (kök)
- Her paketin kendi `tsconfig.json`'ı
- ESLint config (kebab-case dosya adı kuralı dahil) + Prettier config

**Önkoşullar:**
- [ ] İterasyon 1 Stop tamam
- [ ] `chore/ts-lint-config` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §0.2 — iterasyon kapsamı
2. `.claude/rules/02-language-naming.md` — naming convention tablosu (CODE-003), lint'e yansıtılacak kurallar
3. `.claude/rules/00-project-identity.md` — TS-001 (TypeScript uçtan uca)

**Uygulama planı:**
1. Kök `tsconfig.base.json` — `strict: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`.
2. Her paketin `tsconfig.json`'ı → `"extends": "../../tsconfig.base.json"` (paket-özel `include`/`outDir`).
3. Kök ESLint config — `@typescript-eslint` + dosya adı `kebab-case` kuralı (`.claude/rules/02-language-naming.md` CODE-003 tablosu: `real-return.ts`, `asset-repository.ts` gibi).
4. Kök `.prettierrc` + `.prettierignore`.
5. Root `package.json`'a `lint`, `format` script'leri ekle.
6. `pnpm -w lint` çalıştır, boş kod tabanında hatasız geçtiğini doğrula.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `tsconfig.base.json`, `apps/web/tsconfig.json`, `apps/worker/tsconfig.json`, `packages/core/tsconfig.json`, ESLint config dosyası, `.prettierrc`, `.prettierignore` |
| Güncelle | Kök `package.json` (scripts + devDependencies) |
| Dokunma | CI workflow (İterasyon 3) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Dosya/klasör `kebab-case` | `.claude/rules/02-language-naming.md` CODE-003 | ESLint dosya adı kuralı (`unicorn/filename-case: kebabCase` veya eşdeğeri) |
| TypeScript strict | `.claude/rules/00-project-identity.md` TS-001 | `tsconfig.base.json` `strict: true` |
| Format tekilliği | `docs/09_DEV_WORKFLOW.md` (CI lint adımı) | `eslint-config-prettier` ile ESLint/Prettier çakışması önlenir |

**Kalite kapıları:**
- [ ] `pnpm -w lint` hatasız
- [ ] `pnpm -w format --check` hatasız
- [ ] Naming convention kuralının gerçek bir ihlali (geçici camelCase dosya adıyla) yakaladığı manuel doğrulanır, test dosyası sonra silinir

**Bu iterasyonda yok:** CI workflow'a bağlama (İterasyon 3), test framework kurulumu (Vitest, Faz 1 §1.4).

**Risk / dikkat:** ESLint flat config (v9) mi yoksa `.eslintrc` mi seçilirse tüm paketlerde tutarlı olmalı. Next.js dinamik route dosya adları (`[id].tsx`) kebab-case kuralına istisna teşkil eder — kural konfigürasyonunda bu istisna belgelenmeli.

**Stop:**
- [ ] `pnpm -w lint`
- [ ] `pnpm -w format --check`
- [ ] PR/onay → İterasyon 3

---

## İterasyon 3 — GitHub Actions CI İskeleti (§0.3)

**Hedef:** GitHub Actions'ta `lint`+`build` job'ları çalışıyor (henüz `test` yok — `docs/10` §1'e göre Faz 1 §1.4'te eklenecek).

**Teslim çıktısı:**
- `.github/workflows/ci.yml` (`lint` → `build` sıralı job'lar)

**Önkoşullar:**
- [ ] İterasyon 2 Stop tamam
- [ ] `chore/ci-skeleton` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §0.3 — iterasyon kapsamı
2. `.claude/rules/04-quality-gates.md` — CI Gate sırası (INF-002: Lint→Test→Build→Dep tarama)

**Uygulama planı:**
1. `.github/workflows/ci.yml` — `lint` job (`pnpm install` + `pnpm -w lint`), `build` job (`needs: lint`, `pnpm install` + `pnpm -w build`).
2. `actions/setup-node` + `pnpm/action-setup`, pnpm store cache aktif.
3. Root `package.json`'a `build` script ekle (şimdilik paket başına no-op/`tsc --noEmit` placeholder — gerçek Next.js build Faz 4'te anlam kazanır).
4. Workflow dosyasını push et, GitHub Actions sekmesinde `lint`+`build`'in yeşil olduğunu doğrula.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `.github/workflows/ci.yml` |
| Güncelle | Kök `package.json` (`build` script) |
| Dokunma | `test` job'u (Faz 1 §1.4'te eklenecek), deploy config |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Lint→Build sıra | `.claude/rules/04-quality-gates.md` INF-002 | `ci.yml`'de `build` job'u `needs: lint` |
| `test` job'u henüz yok | `docs/10` §1 ("Bu fazın CI gate'i: test job'u Faz 1 sonundan itibaren zorunlu") | `ci.yml`'de yalnızca 2 job; 3. job Faz 1 §1.4'te eklenir |
| pnpm workspaces CI cache | `.claude/rules/00-project-identity.md` TS-005 | `pnpm/action-setup` + `actions/setup-node` ile `cache: pnpm` |

**Kalite kapıları:** (scaffold — test yok, aşağıdakiler yeterli)
- [ ] `ci.yml` YAML syntax geçerli (GitHub Actions kendi doğrulaması)
- [ ] Push sonrası Actions sekmesinde `lint`+`build` yeşil

**Bu iterasyonda yok:** `test` job'u, deploy job'u, dependency taraması (Faz 5 §5.4).

**Risk / dikkat:** CI'daki `pnpm/action-setup` sürümü kök `package.json`'daki `packageManager` alanıyla uyumsuzsa build kırılır — İterasyon 1'de sabitlenen sürümle senkron tutulmalı; Node sürümü de (`actions/setup-node` `node-version`) 22 LTS ile eşleşmeli.

**Stop:**
- [ ] `git push` ile CI tetikle, Actions sekmesinde `lint`+`build` yeşil
- [ ] PR/onay → İterasyon 4

---

## İterasyon 4 — Local Ortam (§0.4)

**Hedef:** Docker Compose ile lokal Postgres ayağa kalkıyor; `.env.example`, `docs/04_BACKEND_SPEC.md §10`'daki 7 değişkenin tamamını placeholder ile içeriyor.

**Teslim çıktısı:**
- `docker-compose.yml` (lokal Postgres 16+)
- `.env.example` (7 değişken)
- Kök `README.md` (minimal, local kurulum adımlarına pointer)

**Önkoşullar:**
- [ ] İterasyon 3 Stop tamam
- [ ] `chore/local-env-setup` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §0.4 — iterasyon kapsamı
2. `docs/04_BACKEND_SPEC.md` §10 — env değişkenleri tablosu (7 satır, birebir kopyalanacak isimler)
3. `docs/09_DEV_WORKFLOW.md` §6–7 — local kurulum adımları, secret temin şekli

**Uygulama planı:**
1. Kök `docker-compose.yml` — `postgres:16` servisi, `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD` env, named volume, `5432:5432` port mapping.
2. Kök `.env.example` — `DATABASE_URL`, `TCMB_EVDS_API_KEY`, `COINGECKO_API_KEY`, `OPERATOR_USERNAME`, `OPERATOR_PASSWORD`, `NODE_ENV`, `LOG_LEVEL` (`docs/04` §10 ile birebir isim eşleşmesi, gerçek değer yok).
3. `.gitignore`'da `.env` satırının var olduğunu doğrula (yoksa ekle).
4. Kök `README.md` — `docs/09` §6'daki 7 adıma pointer + `docker compose up -d` komutu (adımlar kopyalanmaz, dosya referansı verilir).
5. `docker compose up -d` çalıştır, `docker compose ps` ile Postgres'in ayakta olduğunu doğrula.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `docker-compose.yml`, `.env.example`, `README.md` |
| Güncelle | `.gitignore` (gerekirse) |
| Dokunma | Gerçek migration (`prisma migrate dev`, Faz 1 §1.1), seed (Faz 1 §1.3) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| 7 env değişkeni | `docs/04_BACKEND_SPEC.md` §10 | `.env.example`'da placeholder değerlerle, isim birebir |
| Secret asla commit edilmez | `.claude/rules/03-security-baseline.md` (SEC-003) | `.env` `.gitignore`'da; `.env.example`'da yalnızca placeholder |
| Local Postgres | `docs/09_DEV_WORKFLOW.md` §6 madde 2 | `docker-compose.yml` `postgres:16` servisi |

**Kalite kapıları:**
- [ ] `docker compose up -d` sonrası `docker compose ps` Postgres'i çalışır durumda gösteriyor
- [ ] `.env.example`'daki 7 değişken `docs/04` §10 tablosuyla birebir (isim karşılaştırması)
- [ ] `.env` gerçek dosyası commit edilmemiş (`git status` temiz)

**Bu iterasyonda yok:** Gerçek migration (`prisma migrate dev`), seed script (ikisi de Faz 1).

**Risk / dikkat:** `DATABASE_URL` placeholder formatı Prisma'nın beklediği connection string şablonuyla uyumlu olmalı (`postgresql://user:pass@localhost:5432/terazi`) — Faz 1 §1.1'de doğrudan kullanılacak, burada yanlış formatlanırsa bir sonraki fazda sürtünme yaratır. Postgres sürümü `.claude/rules/00-project-identity.md` TS-006 (16+) ile uyumlu pin edilmeli.

**Stop:**
- [ ] `docker compose up -d && docker compose ps`
- [ ] `.env.example` diff review (7 değişken)
- [ ] Faz 0 Done Definition kontrolü; `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 0 işareti
- [ ] PR/onay → Faz 1 (İterasyon 1)

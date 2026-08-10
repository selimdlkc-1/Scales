---
name: phase-02-worker-collectors
description: '[Faz 2] Worker ve Veri Toplama — 5 iterasyon/chat (TCMB client+job → TEFAS client+job → CoinGecko client+job → JobRun state machine+retry ortak helper → Railway cron+staging doğrulama). Use when the user says "Faz 2", "Faz 2 — İterasyon N", or asks to add/change a worker data-collection job, TCMB/TEFAS/CoinGecko client, JobRun retry/backoff logic, or cron scheduling. Do NOT use for the Prisma schema/Zod schemas that this phase consumes (Faz 1), API routes that read the collected data (Faz 3), or frontend (Faz 4).'
---

# Faz 2: Worker ve Veri Toplama

## Goal

`apps/worker`'da üç bağımsız veri kaynağı job'unu (TCMB EVDS, TEFAS, CoinGecko) fixture-tabanlı test disipliniyle kurmak; ortak `JobRun` state machine + retry/backoff helper'ını üç job'un da paylaştığı bir yardımcıya çıkarmak; son iterasyonda Railway cron zamanlamasını kurup staging'de tek seferlik gerçek API doğrulaması yapmak (insan onaylı). Detay: `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 2.

## Feature branch (zorunlu)

Her iterasyon kendi `§2.M` alt maddesine karşılık gelir — `git-phase-branch` skill'i **her iterasyon başında ayrı** çalıştırılır:

| İterasyon | Branch |
| --- | --- |
| 1 (§2.1) | `feat/tcmb-client-job` |
| 2 (§2.2) | `feat/tefas-client-job` |
| 3 (§2.3) | `feat/coingecko-client-job` |
| 4 (§2.4) | `refactor/jobrun-state-machine-retry` |
| 5 (§2.5) | `chore/railway-cron-staging` |

## Bu fazın çalışma modeli

- Tek sohbet fazı bitirmez — her chat başında **「Faz 2 — İterasyon M」** belirt.
- Agent **yalnızca çalıştığı iterasyonun dosyasını okur** — `iterations/0M-*.md`, diğerlerini okumaz.
- Plan moduna geçme — iterasyon dosyası yeterli.

## İterasyon indeksi

| # | Teslim | Dosya |
| --- | --- | --- |
| 1 | TCMB EVDS client + job, fixture integration test | `iterations/01-tcmb-client-job.md` |
| 2 | TEFAS client + job, bozuk-veri fixture → `partial` testi | `iterations/02-tefas-client-job.md` |
| 3 | CoinGecko client + job, 5 coin fixture testi | `iterations/03-coingecko-client-job.md` |
| 4 | `JobRun` state machine + retry/backoff ortak helper (3 job refactor) | `iterations/04-jobrun-state-machine-retry.md` |
| 5 | Railway cron config + staging gerçek API doğrulaması (**human gate**) | `iterations/05-railway-cron-staging.md` |

> Yalnızca çalıştığın iterasyonun dosyasını oku.

## Required Context

- `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 2 (§2.1–§2.5) — faz geneli
- `.claude/rules/15-worker-jobs.md`, `35-testing.md`, `04-quality-gates.md`, `03-security-baseline.md` — zaten yüklü (path-scoped/koşulsuz), tekrar edilmez

## Done Definition

- [ ] TCMB, TEFAS, CoinGecko job'larının üçü de fixture ile yeşil (`docs/08` §5)
- [ ] `partial`/`failed` durumları en az birer testle kanıtlanmış; TEFAS'ta bozuk veri özellikle test edilmiş (SEC-007 kritik nokta)
- [ ] Aynı `(asset_id, as_of_date)` için job'un iki kez çalıştırılması veri çoğaltmıyor (idempotent upsert)
- [ ] `JobRun` state machine + retry/backoff üç job tarafından ortak bir helper'dan kullanılıyor
- [ ] Railway cron zamanlaması kurulu, staging'de gerçek bir çalıştırma proje sahibi onayıyla doğrulanmış
- [ ] `apps/worker` coverage ≥%60

## Explicit Don'ts

- API route yazma (Faz 3)
- Frontend'den doğrudan TCMB/TEFAS/CoinGecko'ya istek — tüm okuma kendi API/DB'sinden servis edilir (`.claude/rules/03-security-baseline.md`)
- Teste gerçek dış API isteği eklemek — yalnızca İterasyon 5'te, staging'de, tek seferlik, insan onayıyla
- Production seed/deploy (Faz 5 §5.6)

---
Faz bitti → `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 2 işareti.

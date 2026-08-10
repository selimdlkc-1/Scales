---
name: phase-03-api-layer
description: '[Faz 3] API Katmanı — 5 iterasyon/chat (referans veri endpoint grubu → karşılaştırma endpointi → grafik endpointi → health endpointi → middleware zinciri+integration testleri). Use when the user says "Faz 3", "Faz 3 — İterasyon N", or asks to add/change a public REST endpoint under apps/web/app/api (asset-classes, assets, comparison, comparison/series, health) or the withRateLimit/withValidation/withErrorHandling middleware chain. Do NOT use for the Prisma/Zod/calculation layer these endpoints consume (Faz 1), worker jobs (Faz 2), frontend consumption (Faz 4), or admin endpoints (Faz 5 — /api/admin/*).'
---

# Faz 3: API Katmanı

## Goal

`apps/web/app/api` altında 4 public read-only endpoint'i (`asset-classes`, `assets`, `comparison`, `comparison/series`) ve `health` endpoint'ini, `docs/03_API_CONTRACTS.md`'deki response envelope/error taxonomy'e birebir uyarak kurmak; son iterasyonda `withRateLimit`/`withValidation`/`withErrorHandling` middleware zincirini ortak bir yapıya çıkarıp `docs/08_TESTING_STRATEGY.md §4`'teki tüm negatif senaryoları test etmek. Detay: `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 3.

## Feature branch (zorunlu)

Her iterasyon kendi `§3.M` alt maddesine karşılık gelir — `git-phase-branch` skill'i **her iterasyon başında ayrı** çalıştırılır:

| İterasyon | Branch |
| --- | --- |
| 1 (§3.1) | `feat/reference-data-endpoints` |
| 2 (§3.2) | `feat/comparison-endpoint` |
| 3 (§3.3) | `feat/comparison-series-endpoint` |
| 4 (§3.4) | `feat/health-endpoint` |
| 5 (§3.5) | `refactor/middleware-chain-integration-tests` |

## Bu fazın çalışma modeli

- Tek sohbet fazı bitirmez — her chat başında **「Faz 3 — İterasyon M」** belirt.
- Agent **yalnızca çalıştığı iterasyonun dosyasını okur** — `iterations/0M-*.md`.
- Plan moduna geçme — iterasyon dosyası yeterli.
- **Önemli sıralama notu:** İterasyon 1–4'te route'lar kendi basit/ad-hoc doğrulama+hata çevrimini yazar (Faz 2'deki job deseniyle tutarlı: önce bireysel, sonra ortaklaştırma); İterasyon 5 bunları merkezi middleware'e refactor eder. Bu, plan hatası değil, bilinçli sıralamadır (`docs/10` §3.5).

## İterasyon indeksi

| # | Teslim | Dosya |
| --- | --- | --- |
| 1 | Referans veri endpoint'leri — `GET /api/asset-classes`, `GET /api/assets` | `iterations/01-reference-data-endpoints.md` |
| 2 | Karşılaştırma tablosu endpoint'i — `GET /api/comparison` | `iterations/02-comparison-endpoint.md` |
| 3 | Grafik endpoint'i — `GET /api/comparison/series` | `iterations/03-comparison-series-endpoint.md` |
| 4 | Health endpoint'i — `GET /api/health` | `iterations/04-health-endpoint.md` |
| 5 | Middleware zinciri (ortaklaştırma) + tüm negatif senaryo integration testleri | `iterations/05-middleware-chain-integration-tests.md` |

> Yalnızca çalıştığın iterasyonun dosyasını oku.

## Required Context

- `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 3 (§3.1–§3.5) — faz geneli
- `.claude/rules/10-backend-architecture.md`, `14-backend-controllers.md`, `35-testing.md`, `04-quality-gates.md`, `03-security-baseline.md` — zaten yüklü (path-scoped/koşulsuz), tekrar edilmez

## Done Definition

- [ ] 4 public endpoint + `health` çalışır, `docs/03` §5.1–5.4 ile response şekli/cache header'ları birebir
- [ ] Response envelope (`{data,meta}`) tüm başarılı yanıtlarda, `health` hariç (düz JSON, `docs/03` §5.4)
- [ ] Sayısal alanlar (fiyat/getiri) JSON'da her zaman `string`, asla `number`
- [ ] `docs/08` §4'teki bu faza ait tüm deny senaryoları test edilmiş
- [ ] Route → Service → Repository katmanlaması korunmuş; hiçbir route repository'e doğrudan gitmiyor
- [ ] `apps/web` coverage ≥%60

## Explicit Don'ts

- `/api/admin/*` endpoint'i veya `withAdminAuth` yazma (Faz 5 §5.1)
- Frontend tüketimi/fetch kodu yazma (Faz 4)
- Worker job/client değiştirme (Faz 2 tamamlanmış kabul edilir)
- Ayrı bir HTTP client kütüphanesi veya harici rate-limit servisi (Redis vb.) eklemek — in-memory sayaç yeterli (`docs/03` §6)

---
Faz bitti → `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 3 işareti.

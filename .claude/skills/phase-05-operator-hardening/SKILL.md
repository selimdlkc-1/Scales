---
name: phase-05-operator-hardening
description: '[Faz 5] Operatör Paneli ve Sertleştirme — 6 iterasyon/chat (admin API → operatör paneli ekranı → güvenlik başlıkları+rate limit sertleştirme → dependency taraması → coverage kapanışı → production go-live). Use when the user says "Faz 5", "Faz 5 — İterasyon N", or asks to add admin API endpoints, the S-OPERATOR-PANEL screen, CSP/CORS/HSTS hardening, Dependabot/npm audit CI, final coverage closure, or the production go-live checklist. Do NOT use for the public API/frontend this phase reuses (Faz 3/Faz 4) or worker jobs (Faz 2).'
---

# Faz 5: Operatör Paneli ve Sertleştirme

## Goal

`/api/admin/*` endpoint'lerini ve `S-OPERATOR-PANEL` ekranını kurmak, HTTP güvenlik başlıklarını/rate limit'i sertleştirmek, dependency taramasını CI'a bağlamak, tüm coverage eşiklerini gerçek ölçümle kapatmak ve son iterasyonda — proje sahibinin açık onayıyla — production go-live'ı gerçekleştirmek. Bu, projenin son fazıdır. Detay: `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 5.

## Feature branch (zorunlu)

Her iterasyon kendi `§5.M` alt maddesine karşılık gelir — `git-phase-branch` skill'i **her iterasyon başında ayrı** çalıştırılır:

| İterasyon | Branch |
| --- | --- |
| 1 (§5.1) | `feat/admin-api-endpoints` |
| 2 (§5.2) | `feat/operator-panel-screen` |
| 3 (§5.3) | `chore/security-headers-rate-limit-hardening` |
| 4 (§5.4) | `chore/dependency-scanning-ci` |
| 5 (§5.5) | `test/coverage-closure` |
| 6 (§5.6) | `chore/production-go-live` |

## Bu fazın çalışma modeli

- Tek sohbet fazı bitirmez — her chat başında **「Faz 5 — İterasyon M」** belirt.
- Agent **yalnızca çalıştığı iterasyonun dosyasını okur** — `iterations/0M-*.md`.
- Plan moduna geçme — iterasyon dosyası yeterli.
- İterasyon 6, projenin en kritik insan onay noktasıdır — agent proje sahibinin açık onayı olmadan production adımlarına **geçmez**.

## İterasyon indeksi

| # | Teslim | Dosya |
| --- | --- | --- |
| 1 | Admin API endpoint'leri — `job-runs`, `sources` + `withAdminAuth` | `iterations/01-admin-api-endpoints.md` |
| 2 | `S-OPERATOR-PANEL` — `JobRunTable`, `SourceHealthCard`, `/admin` middleware koruması | `iterations/02-operator-panel-screen.md` |
| 3 | HTTP güvenlik başlıkları + rate limit sertleştirmesi | `iterations/03-security-headers-rate-limit-hardening.md` |
| 4 | Dependency taraması CI entegrasyonu | `iterations/04-dependency-scanning-ci.md` |
| 5 | Coverage kapanışı — gerçek ölçümle %90/%60 doğrulama | `iterations/05-coverage-closure.md` |
| 6 | Production go-live (**human gate**) | `iterations/06-production-go-live.md` |

> Yalnızca çalıştığın iterasyonun dosyasını oku.

## Required Context

- `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 5 (§5.1–§5.6), §4 (human gate tablosu) — faz geneli
- `.claude/rules/10-backend-architecture.md`, `14-backend-controllers.md`, `20-frontend-architecture.md`, `24-frontend-components.md`, `04-quality-gates.md`, `03-security-baseline.md` — zaten yüklü (path-scoped/koşulsuz), tekrar edilmez

## Done Definition

- [ ] `/api/admin/*` endpoint'leri `withAdminAuth` ile korunuyor, `/admin` sayfası middleware ile korunuyor (iki bağımsız katman)
- [ ] `S-OPERATOR-PANEL` tüm state'leriyle (`docs/06` §4) çalışır
- [ ] CSP/CORS/HSTS/X-Frame-Options aktif, admin brute-force rate limit'i (10/dk) çalışıyor
- [ ] Dependabot + dependency scan CI'da, kritik/yüksek zafiyet uyarır ama bloklamaz
- [ ] `packages/core` ≥%90, `apps/web`/`apps/worker` ≥%60 coverage gerçek ölçümle doğrulanmış
- [ ] Staging'de tam doğrulama + proje sahibi onayıyla production go-live tamamlanmış

## Explicit Don'ts

- Yeni bir özellik/ekran eklemek — bu faz yalnızca sertleştirme + kapanış
- Proje sahibinin açık onayı olmadan production seed/deploy/DNS adımı başlatmak (İterasyon 6)
- Ayrı bir APM/error-tracking servisi veya WAF/otomatik IP banlama eklemek (`docs/10` §6 teknik borç kaydı — bilinçli erteleme)
- Coverage eşiğini anlamsız/trivial testlerle doldurmak — gerçek deny senaryoları hedeflenir

---
Faz bitti → `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 5 işareti. Proje tamamlandı.

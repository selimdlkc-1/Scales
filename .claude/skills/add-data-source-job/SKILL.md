---
name: add-data-source-job
description: Step-by-step procedure for adding a new worker data-collection job (external API client + Zod response schema + job entrypoint + fixtures) following the tcmb/tefas/coingecko pattern. Use when the user asks to add a new price/data source, a new worker job, or change how an existing source (TCMB/TEFAS/CoinGecko) is fetched. Do NOT use for adding a read endpoint that serves already-collected data (use add-new-endpoint).
---

# Yeni Veri Kaynağı / Worker Job Ekleme Prosedürü

Yeni bir varlık sınıfı veya veri kaynağı eklemek mimari karar gerektirir ([P-007] güncellemesi) — önce `write-adr` ile `docs/mimari-kararlar.md` güncellenmeli. Kaynak zaten kararlaştırılmışsa 6 adım:

## 1. Dış kaynak yanıt şemasını yaz

`packages/core/src/schemas/external/<source>-response.ts` — Zod ile tip/aralık kontrolü ([SEC-007]). Bozuk veri (eksik alan, beklenmeyen tip) senaryolarını da kapsayacak şekilde tasarla.

## 2. HTTP client'ı yaz

`apps/worker/src/clients/<source>-client.ts` — yalnızca `fetch`, ek HTTP kütüphanesi eklenmez (`10-backend-architecture.md`).

## 3. Job'u yaz

`apps/worker/src/jobs/<source>-job.ts` — 3 adımlı çalıştırma (pending satırı → doğrula+transaction upsert → terminal durum güncelle), retry/backoff (3x, 1s→2s→4s), idempotent upsert (`UNIQUE (asset_id, as_of_date)`). Bkz. `15-worker-jobs.md`.

## 4. CLI entrypoint ekle

`apps/worker/src/entrypoints/run-<source>.ts` — cron tarafından tetiklenir, işini bitirince process sonlanır (daemon değil).

## 5. Fixture'ları hazırla

`apps/worker/src/jobs/__fixtures__/` altında hem geçerli hem "bozuk veri" JSON fixture'ları — testler gerçek dış API'ye asla gitmez (`35-testing.md`).

## 6. Dokümantasyon ve zamanlama

- [ ] `docs/mimari-kararlar.md` §12 (Entegrasyonlar) yeni kaynak/karar ID ile güncellendi.
- [ ] `docs/02_DATABASE_SCHEMA.md §9` seed verisine yeni varlıklar eklendiyse yansıtıldı.
- [ ] Railway cron zamanlaması belirlendi ve `04_BACKEND_SPEC.md §8`'e yazıldı.
- [ ] `.env.example`'a yeni API key placeholder'ı eklendi, log maskeleme listesine dahil edildi (`03-security-baseline.md`).

---
Detay: `docs/mimari-kararlar.md` §12; `docs/04_BACKEND_SPEC.md §7-8`; `docs/08_TESTING_STRATEGY.md §5`

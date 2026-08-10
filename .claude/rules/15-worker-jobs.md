---
paths:
  - "apps/worker/src/**/*.ts"
---

# Worker Job Kalıbı

`apps/worker` sürekli çalışan bir daemon **değildir** — her kaynak (`tcmb`, `tefas`, `coingecko`) için ayrı bir CLI entrypoint (`entrypoints/run-*.ts`), hosting platformunun cron'u tarafından tetiklenir, işini bitirince process sonlanır. Prospektif kural — Faz 2'de ilk gerçek job'larla yeniden doğrulanır.

## 3 adımlı çalıştırma (transaction sınırı)

1. `job_runs` tablosuna `status='pending'` satırı eklenir.
2. Dış kaynaktan veri çekilir, **doğrulanır** (§ aşağı), sonra `Prisma.$transaction` içinde toplu upsert — ya hepsi ya hiçbiri.
3. `job_runs` satırı terminal durumla (`success`/`partial`/`failed`) güncellenir.

```typescript
// ✓ Doğru — doğrulama önce, transaction toplu
const validated = externalSchema.safeParse(rawResponse);
if (!validated.success) { skip(); markPartial(); continue; }
await prisma.$transaction(rows.map(r => upsertAssetPrice(r)));

// ✗ Yanlış — ham veri doğrulanmadan tek tek yazılıyor
await prisma.assetPrice.upsert({ data: rawResponse }); // SEC-007 ihlali
```

## Retry/backoff ve idempotency

- Dış API çağrısı başarısız olursa (timeout/5xx): aynı çalıştırma içinde 3 defaya kadar exponansiyel backoff (1s→2s→4s). Üçüncü de başarısız → `failed`; job kendi kendini yeniden zamanlamaz.
- Idempotency DB seviyesinde garanti edilir (`UNIQUE (asset_id, as_of_date)`) — aynı gün tekrar tetiklenirse veri çoğalmaz, upsert edilir.
- Bir kaynağın job'u başarısız olsa dahi diğer ikisi etkilenmez (bağımsız process'ler); `failed` durumunda önceki günün verisi DB'de değişmeden kalır (graceful degradation).

## Dış kaynak doğrulama ([SEC-007])

Her yanıt `schemas/external/*.ts` Zod şemasıyla DB'ye yazılmadan önce doğrulanır. Beklenmeyen format job'u sessizce bozmaz — kayıt atlanır, `JobRun.status='partial'`, `error_message` doldurulur. Bu özellikle TEFAS için kritiktir (resmî olmayan, kırılgan kaynak).

## Zamanlama

TCMB/TEFAS: her iş günü 18:30 Europe/Istanbul. CoinGecko: her 4 saatte bir (00/04/08/12/16/20).

## Anti-pattern'ler

- Şema doğrulamasından geçmemiş veriyi DB'ye yazmak.
- Tek tek `upsert` çağırıp transaction sınırını atlamak (kısmi yazım DB tutarsızlığı yaratır).
- Job'u kendi kendine yeniden zamanlamak (bir sonraki cron tetiklemesini beklemek yerine).

---
Detay: `docs/04_BACKEND_SPEC.md §7-8`; `docs/01_DOMAIN_MODEL.md §5` (JobRun state machine); `docs/07_SECURITY_IMPLEMENTATION.md §6`

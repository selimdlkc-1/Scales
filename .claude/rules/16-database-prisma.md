---
paths:
  - "packages/core/prisma/**"
  - "packages/core/src/prisma/**"
---

# Veritabanı ve Prisma

PostgreSQL 16+, erişim yalnızca Prisma ORM üzerinden. Prospektif kural — Faz 1'de ilk gerçek migration ile yeniden doğrulanır.

## Naming ve tip kuralları

- Tablo: `snake_case`, çoğul (`asset_prices`). Kolon: `snake_case`. PK: `id BIGSERIAL`. FK: `<tablo_tekil>_id`.
- Zaman damgası: `created_at`/`updated_at`, `TIMESTAMPTZ`, UTC.
- Kısıtlı metin alanları `VARCHAR` + `CHECK (col IN (...))` — native `ENUM` kullanılmaz (migration sürtünmesi az).
- Para/fiyat alanları daima `NUMERIC(p,s)` — **hiçbir alan `FLOAT`/`DOUBLE PRECISION` olamaz** ([TS-006]).

```prisma
// ✓ Doğru
price   Decimal @db.Decimal(20, 6)

// ✗ Yanlış
price   Float
```

## Tekil PrismaClient

`packages/core/src/prisma/client.ts` tek bir `PrismaClient` export eder; `apps/web` ve `apps/worker` bunu import eder — istek/job başına yeni client oluşturulmaz.

## Migration disiplini

- `prisma migrate dev --name <açıklayıcı_isim>`; elle SQL migration yazılmaz, `schema.prisma` diff'i PR'da review edilir.
- **Forward-fix politikası:** Prisma "down migration" üretmez. Hatalı migration'ı geri almak yeni bir düzeltici migration ile yapılır — eski migration silinmez/değiştirilmez, production geçmişi elle düzenlenmez.
- Kolon tipi değişimi gibi veri dönüşümü gerektiren şema değişikliği iki adımlı yapılır: yeni kolon ekle → veri dönüştür → (sonraki migration'da) eski kolonu kaldır.

## Seed

Seed script'i idempotenttir — `asset_classes`/`assets` için var olan `symbol`/`code` üzerinden upsert yapar, çoğaltma oluşturmaz.

## Anti-pattern'ler

- Parasal alan için `Float`/`Int` kullanmak.
- Elle yazılmış SQL migration (Prisma diff'i atlanarak).
- Var olan bir migration dosyasını sonradan düzenlemek/silmek.

---
Detay: `docs/02_DATABASE_SCHEMA.md §1-2, §8-9`; `docs/mimari-kararlar.md` [TS-006]

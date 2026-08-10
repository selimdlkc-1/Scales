---
name: add-prisma-migration
description: Step-by-step procedure for changing packages/core's Prisma schema and generating a migration — naming/type conventions, forward-fix rollback policy, seed impact. Use when the user asks to add/change a DB table or column, or run a Prisma migration. Do NOT use for one-off data fixes in production (that's an operational task, not a schema change) or for query changes that don't touch schema.prisma.
---

# Prisma Migration Ekleme Prosedürü

5 adım. Şema değişikliği mimari karar gerektiriyorsa (yeni tablo/varlık sınıfı) önce `write-adr`.

## 1. `schema.prisma`'yı düzenle

Naming: tablo `snake_case` çoğul, kolon `snake_case`, PK `id BIGSERIAL`, FK `<tablo_tekil>_id`. Para/fiyat alanları **daima** `Decimal` (`@db.Decimal(p,s)`) — `Float` yasak (bkz. `16-database-prisma.md`).

## 2. Migration'ı üret

```bash
pnpm --filter core prisma migrate dev --name <açıklayıcı_isim>
```

Elle SQL migration yazma; dosya adlandırmasını Prisma'nın kendi `YYYYMMDDHHMMSS_` konvansiyonuna bırak.

## 3. Veri dönüşümü gerekiyorsa iki adımlı yaklaş

Kolon tipi değişimi vb.: (a) yeni kolon ekle → veri dönüştür (aynı migration), (b) eski kolonu **sonraki** migration'da kaldır. Tek adımda kırma yapma.

## 4. Seed script'ini gözden geçir

Yeni bir referans veri (asset_class, asset) eklendiyse `packages/core`/`apps/worker` seed script'ini güncelle — idempotent olmalı (var olan `symbol`/`code` üzerinden upsert).

## 5. Dokümantasyon

- [ ] `docs/02_DATABASE_SCHEMA.md §2` ilgili tablo tanımı güncellendi.
- [ ] Yeni index gerekiyorsa `§4` (Index Stratejisi) güncellendi.
- [ ] Migration PR'da diff olarak review edildi — production'a otomatik `prisma migrate deploy` staging sonrası.
- [ ] Rollback gerekiyorsa **forward-fix** migration yazıldı, eski migration silinmedi/değiştirilmedi.

---
Detay: `docs/02_DATABASE_SCHEMA.md §1-2, §8`

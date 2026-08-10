---
name: add-new-endpoint
description: Step-by-step procedure for adding or modifying a REST endpoint under apps/web/app/api — Zod query schema, service/repository wiring, middleware composition, response envelope, contract doc update. Use when the user asks to add a new API route, expose comparison/reference/admin data, or change an existing route handler's query params or response shape. Do NOT use for worker jobs that write to the DB (use add-data-source-job) or for frontend-only data fetching changes.
---

# Yeni REST Endpoint Ekleme Prosedürü

6 adım. Her adım tek concern — atlama CI/review maliyeti doğurur.

## 1. Query şemasını tanımla

`packages/core/src/schemas/api/<endpoint>-query.ts` içinde Zod şeması — tanınmayan/geçersiz değer `400 VALIDATION_ERROR` üretmeli ([SEC-006]).

## 2. Servis fonksiyonunu yaz (veya genişlet)

`apps/web/lib/services/` altında — iş kuralını burada uygula, repository + `packages/core` hesaplama fonksiyonlarını çağır. Route handler'a hesaplama sızdırma (bkz. `10-backend-architecture.md`).

## 3. Repository sorgusunu yaz (gerekiyorsa)

`apps/web/lib/repositories/` altında — Prisma sorgusu yalnızca burada; servise düz TS nesnesi dön.

## 4. Route handler'ı middleware zinciriyle sarmala

```typescript
export const GET = withErrorHandling(
  withRateLimit(
    withValidation(querySchema, handler)
  )
);
```

`/api/admin/*` ise `withAdminAuth` da zincire eklenir (bkz. `14-backend-controllers.md`).

## 5. Response envelope ve error taxonomy'e uy

Başarı: `{ data, meta: { requestId, generatedAt } }`. Yeni bir hata durumu gerekiyorsa önce `error.code` sözlüğüne ekle (`docs/03_API_CONTRACTS.md §3`) — ad-hoc string üretme. Sayısal alanlar (fiyat/getiri) her zaman `string` serileşir, asla `number` değil.

## 6. Test ve dokümantasyon

- [ ] Integration test: mutlu yol + en az bir deny senaryosu (`04-quality-gates.md`).
- [ ] `docs/03_API_CONTRACTS.md §5` yeni/değişen endpoint ile güncellendi.
- [ ] Cache-Control politikası belirlendi (public veri mi, `no-store` mu — admin endpoint'leri `no-store`).

---
Detay: `docs/03_API_CONTRACTS.md`; `docs/04_BACKEND_SPEC.md §4-6`; `docs/07_SECURITY_IMPLEMENTATION.md §6`

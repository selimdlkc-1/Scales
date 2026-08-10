---
paths:
  - "apps/web/app/api/**/*.ts"
---

# Backend Controllers (API Route Handlers)

Next.js API routes; middleware Express pipeline değil, higher-order function kompozisyonudur. Prospektif kural — Faz 3'te ilk gerçek route'larla yeniden doğrulanır.

## Middleware zinciri (dıştan içe)

```typescript
withErrorHandling(
  withRateLimit(
    withValidation(querySchema,
      withAdminAuth( // yalnızca /api/admin/* route'larında
        handler
      )
    )
  )
)
```

1. `withErrorHandling` — her exception'ı yakalar, error taxonomy'e çevirir, `meta.requestId` üretir.
2. `withRateLimit` — IP başına istek sayısı ([SEC-005]); aşımda `429` ile kısa devre.
3. `withValidation` — query parametrelerini Zod şemasıyla parse eder ([SEC-006]); hata → `400 VALIDATION_ERROR`.
4. `withAdminAuth` — yalnızca `/api/admin/*`; `Authorization: Basic` eksik/hatalı → `401`.

## Response envelope (tüm başarılı yanıtlar)

```json
{ "data": {}, "meta": { "requestId": "…", "generatedAt": "…" } }
```

Hata yanıtı `error.code` (`VALIDATION_ERROR`, `ASSET_NOT_FOUND`, `INVALID_PERIOD`, `INVALID_ASSET_SELECTION`, `UNAUTHORIZED`, `RATE_LIMITED`, `INTERNAL_ERROR`) + `error.message` (Türkçe, gösterilebilir) + opsiyonel `error.details`.

```typescript
// ✓ Doğru — route handler kendi try/catch'ini yazmaz, domain exception throw eder
if (!asset) throw new AssetNotFoundError(symbol);

// ✗ Yanlış — route handler kendi hata çevrimini yapıyor
try { ... } catch (e) { return NextResponse.json({ error: 'oops' }, { status: 500 }); }
```

## Validation kalıbı

Şemalar `packages/core/src/schemas/api/*.ts` altında; route handler'ın en dış katmanında uygulanır — servis katmanına "belki doğrulanmıştır" varsayımıyla ham veri geçirilmez.

## Anti-pattern'ler

- Route handler'da `try/catch` ile ad-hoc hata çevrimi (tek merkez `withErrorHandling`'dir).
- Sayısal alanları JSON'da `number` olarak döndürmek — fiyat/getiri alanları her zaman `string`.
- `/api/admin/*` route'u eklerken `withAdminAuth` sarmalamasını unutmak.

---
Detay: `docs/04_BACKEND_SPEC.md §4-6`; `docs/03_API_CONTRACTS.md §1-3, §5`

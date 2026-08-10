---
paths:
  - "apps/web/app/api/**"
  - "apps/web/lib/**"
  - "apps/worker/src/**"
  - "packages/core/src/**"
---

# Backend Mimarisi

`apps/web` (istek-cevap) ve `apps/worker` (cron job) aynı 3 katmanlı sorumluluk ayrımını izler. Prospektif kural — Faz 0 iskeleti oluşana kadar klasörler `docs/04_BACKEND_SPEC.md §2`'deki plana göre değerlendirilir.

## 3 katman

1. **Route handler / job entrypoint:** yalnızca girdi doğrulama (Zod) + servis çağrısı + yanıt/log biçimlendirme. İş kuralı/hesaplama içermez.
2. **Servis katmanı** (`lib/services/`): iş kurallarını uygular, repository + `packages/core` hesaplama fonksiyonlarını çağırır. Prisma client'a doğrudan erişmez, HTTP detayı bilmez.
3. **Repository katmanı** (`lib/repositories/`): Prisma sorgularının tek bulunduğu yer. Servise düz TypeScript nesneleri döner, `Prisma.*GetPayload` tiplerini dışarı sızdırmaz.

```typescript
// ✓ Doğru — route → service → repository
export async function GET(req) {
  const data = await comparisonService.getComparison(params);
  return NextResponse.json({ data, meta });
}

// ✗ Yanlış — route handler repository'e doğrudan gidiyor
export async function GET(req) {
  const rows = await assetRepository.findAssetPrices(params); // servis katmanı atlandı
}
```

## DI / bağımlılık yönetimi

- Ağır bir DI container kurulmaz ([P-004] ölçeği gerektirmez); açık fonksiyon parametreleri + modül-seviyesi singleton'lar kullanılır.
- `packages/core/src/prisma/client.ts` tek bir `PrismaClient` export eder — hem web hem worker bunu import eder, istek/job başına yeni client oluşturulmaz.
- Servisler repository'yi doğrudan import eder (parametre olarak almaz); repository fonksiyonları saf, bağımsız export'lardır (testte `vi.mock()`).
- Dış API client'ları (`tcmb-client.ts` vb.) `fetch` tabanlıdır — axios vb. ek HTTP kütüphanesi eklenmez.

## Anti-pattern'ler

- Route handler'da iş kuralı/hesaplama yazmak.
- Servis katmanında `PrismaClient`'ı doğrudan import etmek.
- Her istek/job için yeni `PrismaClient` instance'ı oluşturmak.

---
Detay: `docs/04_BACKEND_SPEC.md §1-3`; `docs/mimari-kararlar.md` [CODE-002]

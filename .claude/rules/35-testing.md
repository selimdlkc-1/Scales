---
paths:
  - "apps/**/*.test.ts"
  - "packages/**/*.test.ts"
  - "apps/web/e2e/**/*.spec.ts"
---

# Test Yazımı

Prospektif kural — Faz 1'de ilk gerçek test dosyalarıyla yeniden doğrulanır.

## Piramit

| Katman | Kapsam | Araç |
| --- | --- | --- |
| Unit | `packages/core` hesaplama fonksiyonları, Zod şemaları | Vitest |
| Integration | `apps/web` API route'ları, `apps/worker` job'ları (test DB'sine karşı) | Vitest |
| Smoke E2E | Birkaç kritik kullanıcı akışı | Playwright |

[P-004] gereği yatırım ağırlıklı unit/integration'da — kapsamlı e2e matrisi kurulmaz.

## Fixture-only, gerçek dış API yok

Testler ve lokal geliştirme TCMB/TEFAS/CoinGecko yanıtlarının **sabit fixture JSON'larıyla** çalışır (`apps/worker/src/jobs/__fixtures__/`). Gerçek dış API'ye test sırasında **asla** gidilmez. Fixture'lar hem geçerli hem "bozuk veri" (eksik alan, beklenmeyen tip, TEFAS ondalık ayraç varyasyonu) senaryolarını içerir.

```typescript
// ✓ Doğru
const response = tefasFixtureBroken; // eksik alan içeren sabit JSON
expect(() => tefasResponseSchema.parse(response)).toThrow();

// ✗ Yanlış — teste gerçek dış API çağrısı
const response = await fetch('https://www.tefas.gov.tr/...'); // asla test'te
```

## Kritik modüller (her yeni fonksiyonda %90+ korunur)

`calculations/real-return.ts`, `calculations/normalized-return.ts`, `schemas/external/*.ts`, `apps/worker/src/jobs/*.ts` — yanlış sonucun doğrudan yanlış finansal bilgi olarak ulaşabileceği tek yerler.

## Zorunlu deny senaryoları

Sıfır/eksik başlangıç fiyatı, bozuk dış kaynak yanıtı, geçersiz query parametresi, 6. varlık seçimi, admin auth'suz istek, rate limit aşımı, idempotent upsert (aynı job iki kez). Tam liste: `04-quality-gates.md`.

## Dosya yerleşimi ve adlandırma

Test dosyası kaynağıyla **aynı klasörde**, `.test.ts` uzantısıyla (`real-return.ts` → `real-return.test.ts`); ayrı `__tests__/` hiyerarşisi kurulmaz. Playwright e2e testleri `apps/web/e2e/*.spec.ts` altında toplanır. Desen: `describe('<modül>')` → `it('<beklenen davranış>')`.

## Anti-pattern'ler

- Teste gerçek dış API isteği eklemek.
- Kritik modülde coverage'ı %90 altına düşürecek değişiklik yapıp test eklememek.
- Ayrı bir `__tests__/` klasör hiyerarşisi açmak.

---
Detay: `docs/08_TESTING_STRATEGY.md` (tam); `docs/mimari-kararlar.md` [TEST-001]-[TEST-004]

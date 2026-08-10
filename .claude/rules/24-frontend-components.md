---
paths:
  - "apps/web/components/**/*.tsx"
---

# Frontend Bileşenleri

Prospektif kural — Faz 4'te ilk gerçek component'lerle yeniden doğrulanır.

## Katmanlar ve yeniden kullanım kuralı

| Katman | Konum | Kural |
| --- | --- | --- |
| Primitive | `components/ui/` | shadcn/ui, değiştirilmemiş; iş mantığı içermez |
| Composite | `components/comparison/`, `components/admin/` | Props üzerinden veri alır, **kendi içinde fetch yapmaz** |
| Feature/page | `app/page.tsx`, `app/admin/page.tsx` | Composite'leri birleştirir, fetch + URL state burada yönetilir |

```typescript
// ✓ Doğru — composite props alır
function ComparisonTable({ rows }: { rows: ComparisonRow[] }) { ... }

// ✗ Yanlış — composite kendi fetch'ini yapıyor
function ComparisonTable() { const [rows] = useSWR('/api/comparison'); ... }
```

Bir composite, ikinci bir kullanım ihtiyacı doğmadan **erken genelleştirilmez** ([P-004] pragmatizm).

## Tasarım token'ları

Tailwind utility class + shadcn/ui varsayılan tema; ayrı CSS-in-JS/CSS Modules kurulmaz. Proje-özel tasarım sistemi dokümanı yazılmaz — showcase için shadcn/ui varsayılan estetiği yeterli. Karanlık mod v1 kapsamında değil.

## a11y (component seviyesinde)

- Tüm interaktif elemanlar klavye erişilebilir (shadcn/ui Radix tabanlı, varsayılan sağlar — özel `onClick`-only davranış eklenmez).
- Tablo kolonları `<th scope="col">`. Grafiğe `aria-label`; grafik veri aynı zamanda tabloda metinsel de mevcuttur (grafik salt görsel tekrar).
- Pozitif/negatif getiri hem renk hem işaret (`+`/`-`) ile gösterilir.

## Ortak bileşenler (yeniden kullan, kopyalama)

`DisclaimerFooter` ([P-006] sabit metni), `DataState` (loading/error/empty/success), `StatusBadge` (renk+metin durum gösterimi). Yeni bir ekran kendi ad-hoc boş/hata metni yazmadan önce bu bileşenlerin genişletilip genişletilemeyeceği değerlendirilir.

---
Detay: `docs/05_FRONTEND_SPEC.md §6-8`; `docs/06_SCREEN_CATALOG.md §6`

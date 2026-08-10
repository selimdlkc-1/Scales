---
paths:
  - "apps/web/app/**/*.tsx"
  - "apps/web/lib/fetchers/**/*.ts"
  - "apps/web/middleware.ts"
---

# Frontend Mimarisi

Next.js App Router, yalnızca 2 gerçek route: `/` (S-HOME) ve `/admin` (S-OPERATOR-PANEL). Prospektif kural — Faz 4'te ilk gerçek dosyalarla yeniden doğrulanır.

## Server/client state sınırı

- Karşılaştırma verisi her zaman **server state**'tir — component içinde "gerçek kaynak" olarak tutulmaz, filtre değişikliğinde API'den yeniden çekilir.
- Client state yalnızca UI etkileşimini tutar (seçili varlıklar, dönem, sıralama) — **URL query parametrelerinde** tutulur.
- **Kurulmaz:** Redux/Zustand/global state kütüphanesi, TanStack Query/SWR client cache — veri zaten HTTP `Cache-Control` ile önbelleklenir ([P-004] sadelik ilkesi).

```typescript
// ✓ Doğru — filtre durumu URL'de
router.replace(`?${params.toString()}`, { scroll: false });

// ✗ Yanlış — global state kütüphanesi ile filtre tutmak
const filterStore = create((set) => ({ period: '1y', ... })); // Zustand — kurulmaz
```

## Veri çekme

İlk yükleme (`app/page.tsx`) Server Component — servis katmanından doğrudan çeker, HTTP round-trip yok. Filtre değişikliği client component'te `fetch('/api/comparison?...')`. `loading`/`error`/`empty` üç durumu ortak `<DataState>` wrapper'ı ile ele alınır, ad-hoc `if` zinciri yazılmaz.

## Routing ve koruma

`/admin` altındaki her sayfa `apps/web/middleware.ts`'teki Next.js Middleware ile korunur — `Authorization: Basic` eksik/hatalı → `401` + `WWW-Authenticate`. Bu, API route'lardaki `withAdminAuth`'un sayfa seviyesindeki karşılığıdır; biri atlanırsa diğeri korumayı sağlar.

## Layout ve zorunlu uyarı

Kök `app/layout.tsx`: font, global stil, sabit `DisclaimerFooter` ([P-006] — "geçmiş performans gelecekteki getiriyi göstermez"). `/admin` kendi `admin/layout.tsx`'ine sahiptir, kullanıcı navigasyonu/`DisclaimerFooter` içermez.

## Anti-pattern'ler

- Karşılaştırma verisini component state'inde "gerçek kaynak" gibi tutmak.
- `/admin` sayfası eklerken middleware korumasını atlamak.
- Yeni bir global state kütüphanesi eklemek.

---
Detay: `docs/05_FRONTEND_SPEC.md §1-4, §7`; `docs/06_SCREEN_CATALOG.md §1-2`

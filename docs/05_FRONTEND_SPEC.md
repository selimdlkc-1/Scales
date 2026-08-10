# 05. Frontend Spesifikasyonu — Terazi

## 1. Uygulama Yapısı ve Klasör Organizasyonu

```
apps/web/
  app/
    page.tsx                  # S-HOME (Server Component, ilk yükleme)
    admin/
      page.tsx                # S-OPERATOR-PANEL (Server Component)
    not-found.tsx              # S-404
    error.tsx                  # S-500
    api/                       # bkz. 04_BACKEND_SPEC.md
  components/
    comparison/                # ComparisonTable, AssetSelector, PeriodSelector, ReturnChart
    admin/                     # JobRunTable, SourceHealthCard
    ui/                        # shadcn/ui primitive'leri (Button, Select, Table, Badge)
  lib/
    fetchers/                  # client-side fetch sarmalayıcıları
    format.ts                  # sayı/tarih formatlama yardımcıları
```

## 2. Routing Konvansiyonu

- Next.js App Router, dosya-tabanlı routing. Yalnızca 2 gerçek route vardır: `/` (S-HOME) ve `/admin` (S-OPERATOR-PANEL) — bkz. `06_SCREEN_CATALOG.md`.
- **Korumalı route mekanizması:** `/admin` altındaki tüm sayfalar `apps/web/middleware.ts` içinde tanımlı bir Next.js Middleware ile korunur — istek `/admin` path'ine geldiğinde `Authorization: Basic` header'ı kontrol edilir, eksik/hatalıysa `401` + `WWW-Authenticate` döner (tarayıcı native diyalog gösterir). Bu, `04_BACKEND_SPEC.md §4`'teki `withAdminAuth`'un API route'ları için olan karşılığıdır — sayfa (page) seviyesinde ayrıca aynı kontrol Next.js Middleware ile tekrarlanır çünkü sayfa render'ı API route'lardan farklı bir istek yaşam döngüsüdür.
- **Layout hiyerarşisi:** Tek bir kök `app/layout.tsx` (font, global stil, sabit "geçmiş performans gelecekteki getiriyi göstermez" footer uyarısı — [P-006]). `/admin` kendi `admin/layout.tsx`'ine sahiptir (farklı, sade bir operatör kabuğu — kullanıcı navigasyonu içermez).
- Sorgu parametreleri (`assets`, `period`, `sortBy`, `sortDir`) URL'de tutulur (`useSearchParams` + `router.replace(..., { scroll: false })`) — filtre durumu sayfa yenilendiğinde veya link paylaşıldığında korunur.

## 3. State Yönetimi Stratejisi

- **Server state / client state sınırı:** Karşılaştırma verisi (`AssetPrice`, `real_return` vb.) her zaman **server state**'tir — component içinde asla "gerçek kaynak" olarak tutulmaz, her filtre değişikliğinde API'den yeniden çekilir.
- **Client state**, yalnızca UI etkileşim durumunu tutar: seçili varlıklar, seçili dönem, tablo sıralama alanı, grafik açık/kapalı durumu. Bu state URL query parametrelerinde tutulur (bkz. §2) — ayrı bir global state kütüphanesi (Redux, Zustand vb.) **kurulmaz**; sayfa tek bir etkileşim ağacı olduğu için React'in yerel state'i (`useState`) ve URL yeterlidir.
- Ayrı bir client-side cache kütüphanesi (TanStack Query, SWR) **kurulmaz** — veri zaten HTTP `Cache-Control` başlıklarıyla önbelleklendiği için ([03_API_CONTRACTS.md §5]) ek bir client cache katmanı fayda/karmaşıklık oranını bozar; bu [P-004]'teki sadelik ilkesiyle uyumludur. Veri çekme doğrudan `fetch` ile yapılır (bkz. §4).

## 4. Veri Çekme Kalıbı

- **İlk yükleme (S-HOME ilk render):** `app/page.tsx` bir Server Component'tir; varsayılan filtrelerle (`period=1y`, tüm aktif varlıklar) karşılaştırma verisini doğrudan servis katmanından (`lib/services/comparison-service.ts`) — HTTP round-trip yapmadan — çeker ve ilk HTML'e gömer. Bu, ilk sayfa yükünde gereksiz bir kendi-kendine fetch turunu önler.
- **Filtre değişikliği (client-side):** Kullanıcı varlık/dönem seçimini değiştirdiğinde, client component `fetch('/api/comparison?...')` çağrısı yapar; sonuç geldiğinde tablo/grafik re-render olur. Bekleme sırasında `isPending` (React `useTransition`) ile tablo üstünde hafif bir opacity/skeleton state gösterilir — tüm tablo kaybolmaz (ani layout shift önlenir).
- **Loading/error state standardı:** Her veri çeken component üç durumu da açıkça ele alır — `loading` (skeleton satırlar), `error` (kırmızı satır banner + "Tekrar dene" butonu, hatanın `error.message`'ı gösterilir), `empty` (`rows.length === 0` veya tüm satırlar `status="unavailable"` — "Bu dönem için veri bulunamadı" mesajı). Bu üç state'in component'siz, ad-hoc `if` zinciriyle değil, ortak bir `<DataState>` wrapper component'i ile ele alınması standarttır.
- **Retry:** `fetch` başarısız olursa (`5xx`/network) bir kez otomatik retry (1 saniye sabit bekleme, bkz. `03_API_CONTRACTS.md §7`); ikinci hata kullanıcıya `error` state'i olarak yansır.

## 5. Form Kalıbı

Terazi'de klasik anlamda bir "gönderilen" form yoktur (kullanıcı hesabı, veri girişi yok — [P-002], [P-008]). Tek etkileşimli girdi grubu **filtre kontrolleri**dir (varlık çoklu seçim, dönem seçici):

- Filtre değişiklikleri **anında** uygulanır (submit butonu yok) — her seçim değişikliği URL query'sini günceller ve §4'teki client-side fetch'i tetikler.
- **Validation:** Varlık seçimi 5'i aşarsa (grafik kısıtı, [03_API_CONTRACTS.md §3]) beşinciden sonraki seçenekler UI'da devre dışı bırakılır (disabled), kullanıcı zaten geçersiz bir kombinasyon oluşturamaz — backend validation hatası (`INVALID_ASSET_SELECTION`) yalnızca URL'nin elle değiştirildiği durumlar için bir güvenlik ağıdır, normal kullanım akışında hiç tetiklenmemesi beklenir.
- **Hata gösterimi:** Backend'den `VALIDATION_ERROR`/`INVALID_PERIOD` dönerse (yalnızca elle URL manipülasyonunda mümkün), filtre alanı varsayılan değere sıfırlanır ve kısa bir uyarı gösterilir; sayfa çökmez.
- Operatör panelinde de form yoktur — Basic Auth tarayıcı native diyaloğuyla halledilir, uygulama içi bir login formu yazılmaz.

## 6. Bileşen Katmanları

| Katman | İçerik | Yeniden kullanım kuralı |
| --- | --- | --- |
| **Primitive** (`components/ui/`) | shadcn/ui'den alınan, projeye özel değiştirilmemiş temel bileşenler (Button, Select, Table, Badge, Skeleton) | Doğrudan import edilir, iş mantığı içermez |
| **Composite** (`components/comparison/`, `components/admin/`) | Primitive'leri birleştiren, tek bir işlevsel birim (`AssetSelector`, `PeriodSelector`, `ComparisonTable`, `ReturnChart`, `JobRunTable`) | Props üzerinden veri alır, kendi içinde fetch yapmaz (fetch bir üst seviyede, sayfa veya container component'te) |
| **Feature/page** (`app/page.tsx`, `app/admin/page.tsx`) | Composite'leri bir araya getirip veri akışını (fetch, URL state) yönetir | Tek bir sayfanın kök bileşeni; başka bir sayfada import edilmez |

Kural: Bir composite component ikinci bir yerde kullanılma ihtiyacı doğmadan önce genelleştirilmez (erken soyutlama yapılmaz) — [P-004]'teki pragmatizm ilkesiyle tutarlı.

## 7. Tasarım Token'ları ve Stil Kuralları

- Stil Tailwind CSS utility class'larıyla yazılır; ayrı bir CSS-in-JS veya CSS Modules katmanı kurulmaz.
- Renk paleti, spacing, tipografi shadcn/ui'nin varsayılan Tailwind config'i (`tailwind.config.ts` içindeki tema token'ları) üzerinden gelir; proje-özel bir tasarım sistemi belgesi v1'de yazılmaz — showcase amaçlı bir proje için shadcn/ui'nin varsayılan estetiği yeterli kabul edilir.
- Karanlık mod v1 kapsamında değildir (belirtilmemiş bir özellik — eklenmek istenirse önce `docs/00_PROJECT_OVERVIEW.md` güncellenir).
- Sabit uyarı metni ("Geçmiş performans gelecekteki getiriyi göstermez") her sayfanın alt bilgisinde (footer), `text-sm text-muted-foreground` stiliyle, tüm sayfalarda aynı bileşenden (`components/ui/disclaimer-footer.tsx`) render edilir — [P-006] gereği bu metnin her ekranda bulunması zorunludur, ayrı ayrı yazılmaz.

## 8. Erişilebilirlik (a11y) Minimumları

- Tüm interaktif elemanlar (varlık seçici, dönem seçici, tablo başlıkları sıralama için) klavye ile erişilebilir olmalıdır (Tab/Enter/Space); shadcn/ui bileşenleri (Radix UI tabanlı) bunu varsayılan olarak sağlar, üzerine özel `onClick`-only davranış eklenmez.
- Grafik (Recharts) için: görsel veri, aynı zamanda karşılaştırma tablosunda metinsel/sayısal olarak da mevcuttur — grafik salt görsel bir tekrar sunumudur, ekran okuyucu kullanıcısı bilgiye tablo üzerinden erişebilir. Grafiğe `aria-label="Seçilen varlıkların normalize edilmiş getiri grafiği"` eklenir.
- Tüm tablo kolonları `<th scope="col">` ile işaretlenir (TanStack Table + semantik HTML render'ı).
- Renk tek başına anlam taşımaz: pozitif/negatif getiri hem renk (yeşil/kırmızı) hem de işaretle (`+`/`-`) gösterilir — yalnızca renge dayalı ayırt etme yapılmaz (renk körü kullanıcılar için).
- Minimum kontrast oranı WCAG AA (4.5:1 metin, 3:1 büyük metin/ikon) — shadcn/ui varsayılan tema paleti bu eşiği karşılar, özel renk override'ı yapılmadan önce kontrol edilir.

## 9. Performans Hedefleri (Web Vitals) ve Bundle Bütçesi

| Metrik | Hedef |
| --- | --- |
| LCP (Largest Contentful Paint) | < 2.5s (S-HOME ilk yükleme, Server Component sayesinde) |
| INP (Interaction to Next Paint) | < 200ms (filtre değişikliği → UI tepkisi) |
| CLS (Cumulative Layout Shift) | < 0.1 (skeleton state'ler gerçek içerikle aynı yüksekliği kaplar) |
| JS bundle (ilk yükleme, gzip) | < 250KB (Recharts ve TanStack Table `next/dynamic` ile lazy-load edilir, ilk boyaya dahil edilmez) |

Recharts grafiği yalnızca kullanıcı grafiği görünür hale getirdiğinde (varsayılan olarak sayfa açılışında görünür ama fold-altı değilse) client bundle'a dahil edilir; ağır kütüphaneler statik import ile ilk bundle'ı şişirmez.

## 10. i18n ve Metin Yönetimi

- v1'de çoklu dil altyapısı **yoktur** ([P-005]). Tüm UI metni doğrudan component içinde Türkçe string olarak yazılır — ayrı bir çeviri dosyası (`i18n/tr.json` vb.) veya `next-intl` gibi bir kütüphane kurulmaz.
- İleride i18n eklenmesi gerekirse (v1 kapsamı dışında bir karar), önce `docs/00_PROJECT_OVERVIEW.md §7` güncellenir, bu doküman revize edilir.
- Sayı/tarih formatlama `Intl.NumberFormat('tr-TR', ...)` ve `Intl.DateTimeFormat('tr-TR', ...)` ile yapılır (`lib/format.ts` içinde merkezi yardımcı fonksiyonlar) — her component kendi formatlama mantığını yazmaz.

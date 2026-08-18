# 04. Backend Spesifikasyonu — Terazi

## 1. Katman Mimarisi

Backend iki bağımsız çalışma zamanına ayrılır: `apps/web` (Next.js API routes, istek-cevap döngüsü) ve `apps/worker` (veri toplama, cron-tetiklemeli tek seferlik çalıştırmalar). İkisi de aynı üç katmanlı sorumluluk ayrımını izler:

1. **Route handler / job entrypoint (controller katmanı):** HTTP isteğini veya job tetiklenmesini karşılar. Yalnızca: girdi doğrulama (Zod), servis çağrısı, yanıt/log biçimlendirme yapar. **İş kuralı veya hesaplama içermez.**
2. **Servis katmanı:** İş kurallarını uygular (reel getiri hesaplama akışını orkestre etmek, kaynak yanıtını iç modele dönüştürmek, `is_active` filtreleme mantığı). Repository ve `packages/core` hesaplama fonksiyonlarını çağırır. **Prisma client'a doğrudan erişmez, HTTP/route detayı bilmez.**
3. **Repository katmanı:** Prisma sorgularının tek bulunduğu yer. Servis katmanına düz TypeScript nesneleri döner, Prisma'ya özgü tipleri (`Prisma.AssetGetPayload` vb.) katman dışına sızdırmaz.

**Kesin kural:** Route handler → repository çağrısı **yasaktır**; her zaman servis katmanı üzerinden geçer. Bu, [CODE-001]'deki "hesaplama fonksiyonlarını yanlış yerde çoğaltma" riskini önler.

## 2. Klasör ve Modül Yapısı

```
apps/
  web/
    app/
      api/                    # route handler'lar (§1 controller katmanı)
      page.tsx                # S-HOME
      admin/page.tsx          # S-OPERATOR-PANEL
    lib/
      services/               # iş kuralı orkestrasyon
      repositories/           # Prisma sorguları
      middleware/             # withRateLimit, withAdminAuth, withValidation
  worker/
    src/
      jobs/                   # tcmb-job.ts, tefas-job.ts, coingecko-job.ts
      clients/                # dış API HTTP client'ları
      entrypoints/            # her job için CLI giriş noktası
packages/
  core/
    src/
      calculations/           # real-return.ts, normalized-return.ts (saf fonksiyonlar)
      schemas/                # Zod şemaları (API + dış kaynak doğrulama)
      prisma/                 # tekil PrismaClient instance
```

Her modül içi standart dosyalar: her `services/*.ts` ve `repositories/*.ts` dosyasının yanında aynı isimli `*.test.ts` bulunur (bkz. `08_TESTING_STRATEGY.md`).

## 3. Dependency Injection ve Modül Kayıt Kalıbı

Ağır bir DI container (NestJS tarzı) kurulmaz — proje ölçeği ([P-004]) bunu gerektirmez. Bağımlılıklar **açık fonksiyon parametreleri** ve **modül-seviyesi singleton'lar** ile yönetilir:

- `packages/core/src/prisma/client.ts` tek bir `PrismaClient` instance'ı export eder; hem `apps/web` hem `apps/worker` bunu import eder. Her istek/job için yeni client oluşturulmaz.
- Servis fonksiyonları repository'yi parametre olarak değil, doğrudan import ederek kullanır (örn. `comparison-service.ts` → `import { findAssetPrices } from '../repositories/asset-repository'`). Test edilebilirlik için repository fonksiyonları saf, bağımsız export'lardır — testte `vi.mock()` ile taklit edilir.
- Dış API client'ları (`tcmb-client.ts` vb.) `fetch` tabanlıdır, ayrı bir HTTP client kütüphanesi (axios vb.) eklenmez.

## 4. Middleware Zinciri

Next.js App Router route handler'ları, yüksek-mertebe fonksiyonlarla (higher-order function) sarmalanır — Express tarzı bir middleware pipeline değil, kompozisyon deseni kullanılır:

```
withErrorHandling(
  withRateLimit(
    withValidation(querySchema,
      withAdminAuth(  // yalnızca /api/admin/* route'larında
        handler
      )
    )
  )
)
```

**Sıra ve sorumluluk (dıştan içe çalışır):**
1. `withErrorHandling` — handler'dan fırlayan her exception'ı yakalar, `03_API_CONTRACTS.md §3`'teki error taxonomy'e çevirir, `meta.requestId` üretir.
2. `withRateLimit` — IP başına istek sayısını kontrol eder ([SEC-005]); aşımda `429` ile zinciri kısa devre yapar, handler'a hiç girmez.
3. `withValidation` — query parametrelerini ilgili Zod şemasıyla parse eder ([SEC-006]); hata varsa `400 VALIDATION_ERROR` ile kısa devre yapar. Doğrulanmış, tipli veriyi handler'a geçirir.
4. `withAdminAuth` — yalnızca `/api/admin/*` route'larında zincire eklenir; `Authorization: Basic` header'ını `OPERATOR_USERNAME`/`OPERATOR_PASSWORD` ile karşılaştırır, uyuşmazsa `401` ile kısa devre yapar.
5. **Handler** — servis katmanını çağırır, response envelope'unu üretir.

## 5. Validation Kalıbı

- Tüm şemalar `packages/core/src/schemas/` altında tanımlanır — hem `apps/web` (query parametreleri, [SEC-006]) hem `apps/worker` (dış kaynak yanıtları, [SEC-007]) aynı kütüphaneyi (Zod) ve tek bir şema kaynağını kullanır.
- **İki ayrı şema grubu:**
  - `schemas/api/*.ts` — API query parametreleri (`comparisonQuerySchema`, `seriesQuerySchema`).
  - `schemas/external/*.ts` — dış kaynak yanıt şemaları (`tcmbResponseSchema`, `tefasResponseSchema`, `coingeckoResponseSchema`).
- Validation **her zaman** route handler'ın en dış katmanında (API tarafı) veya job entrypoint'in dış API çağrısından hemen sonra (worker tarafı) uygulanır — servis katmanı içine "belki doğrulanmıştır" varsayımıyla ham veri geçirilmez.
- Doğrulama başarısız olursa: API tarafında `400`, worker tarafında ilgili kaydı atlayıp `JobRun.status='partial'` (bkz. `01_DOMAIN_MODEL.md §5`).

## 6. Exception Handling

Domain exception hiyerarşisi `packages/core/src/errors.ts` altında tanımlanır:

| Exception sınıfı | Ne zaman fırlatılır | `withErrorHandling` çevrimi |
| --- | --- | --- |
| `ValidationError` | Zod parse hatası | `400 VALIDATION_ERROR` |
| `AssetNotFoundError` | İstenen `symbol` aktif varlıklarda yok | `404 ASSET_NOT_FOUND` |
| `InvalidAssetSelectionError` | Grafik için 2'den az/5'ten fazla varlık seçimi | `400 INVALID_ASSET_SELECTION` |
| `UnauthorizedError` | Basic Auth eksik/hatalı | `401 UNAUTHORIZED` |
| `UpstreamDataError` (yalnızca worker) | Dış kaynaktan beklenmeyen/bozuk yanıt | Job'da yakalanır, `JobRun` kaydına yazılır — HTTP'ye hiç yansımaz |
| (yakalanmamış her şey) | Beklenmeyen hata | `500 INTERNAL_ERROR`, mesaj jenerik, orijinal hata yalnızca sunucu log'una yazılır |

Kural: Route handler'lar `try/catch` ile kendi hata çevrimini yapmaz — `withErrorHandling` tek merkezi çevrim noktasıdır. Bir handler özel bir domain exception'ı `throw` eder, sarmalayıcı onu yakalayıp HTTP'ye çevirir.

## 7. Transaction Yönetimi ve Audit Yazımı

- **API tarafı:** Tüm endpoint'ler salt okunur ([P-009]); transaction yönetimi gerekmez.
- **Worker tarafı:** Her job çalıştırması iki aşamalıdır — (1) `job_runs` tablosuna `status='pending'` satırı eklenir, (2) dış kaynaktan veri çekilip doğrulandıktan sonra `Prisma.$transaction` içinde toplu upsert yapılır (tüm `asset_prices`/`cpi_index` satırları ya hep birlikte yazılır ya da hiçbiri — kısmi yazım DB tutarsızlığı yaratmaz), (3) `job_runs` satırı terminal durumla (`success`/`partial`/`failed`) güncellenir. Adım (2) transaction'ı başarısız olursa job `failed` olarak işaretlenir, önceki günün verisi değişmeden kalır (graceful degradation, bkz. `01_DOMAIN_MODEL.md §5`).
- **Klasik audit log yazımı yoktur** ([P-002] — kullanıcı eylemi yok); `job_runs` kaydı operasyonel iz sürme amaçlıdır, güvenlik audit'i değildir.

## 8. Background Job / Worker Kalıbı

- `apps/worker`, sürekli çalışan bir daemon **değildir**. Her veri kaynağı için ayrı bir CLI entrypoint script'i vardır (`entrypoints/run-tcmb.ts`, `run-tefas.ts`, `run-coingecko.ts`); bu script'ler hosting platformunun (Railway) zamanlanmış görev (cron) mekanizması tarafından tetiklenir, işini bitirince process sonlanır ([TS-004]).
- **Zamanlama:** TCMB ve TEFAS job'ları her iş günü **18:30 Europe/Istanbul**'da; CoinGecko job'u **her 4 saatte bir** (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 Europe/Istanbul) çalışır.
- **Retry/backoff:** Bir job içindeki dış API çağrısı başarısız olursa (timeout, 5xx), aynı çalıştırma içinde exponansiyel backoff ile 3 defaya kadar tekrar denenir (1s → 2s → 4s bekleme). Üçüncü deneme de başarısızsa job `failed` olarak işaretlenir; bir sonraki job denemesi bir sonraki zamanlanmış tetiklemeyi bekler (job kendi kendini yeniden zamanlamaz).
- **Graceful degradation:** Bir kaynağın job'u başarısız olsa dahi diğer iki kaynağın job'u etkilenmez (üç job tamamen bağımsız process'lerdir); API katmanı önceki başarılı çalıştırmanın verisini sunmaya devam eder.
- **Idempotency:** Bkz. `02_DATABASE_SCHEMA.md §2.3` (`UNIQUE (asset_id, as_of_date)`) — aynı job aynı gün tekrar tetiklenirse (örn. manuel yeniden deneme) veri çoğalmaz, upsert edilir.

## 9. Logging

- **Format:** Yapılandırılmış JSON (`{ "level", "timestamp", "message", "requestId"?, "jobRunId"?, ...context }`) — düz metin log yazılmaz, hem `apps/web` hem `apps/worker` için geçerli.
- **Seviyeler:** `debug` (yalnızca local), `info` (job başlangıç/bitiş, istek özeti), `warn` (partial job, rate limit tetiklenmesi), `error` (failed job, `500 INTERNAL_ERROR`).
- **Korelasyon:** API isteklerinde `meta.requestId` (bkz. `03_API_CONTRACTS.md §2`) her log satırına eklenir; worker'da `job_runs.id` aynı rolü oynar.
- **Hassas alan maskeleme:** `OPERATOR_PASSWORD`, `OPERATOR_USERNAME`, `TCMB_EVDS_API_KEY`, `COINGECKO_API_KEY` ve `Authorization` header'ı **hiçbir log satırına yazılmaz** — bu alanlar log middleware'inde otomatik olarak `***` ile maskelenir, geliştiricinin her log çağrısında elle maskelemesi beklenmez ([CODE-001] madde 6).
- **Hedef:** Loglar Railway/Vercel'in kendi log akışına yazılır (`INF-003`); ayrı bir log toplama/agregasyon servisi kurulmaz.

## 10. Konfigürasyon ve Env Değişkenleri Tablosu

| Değişken | Kullanıldığı yer | Gizlilik | Açıklama |
| --- | --- | --- | --- |
| `DATABASE_URL` | web, worker | Gizli | PostgreSQL bağlantı string'i |
| `TCMB_EVDS_API_KEY` | worker | Gizli | TCMB EVDS kişisel API key ([I-002]) |
| `COINGECKO_API_KEY` | worker | Gizli (opsiyonel) | Ücretsiz katmanda zorunlu olmayabilir; varsa rate limit'i artırır |
| `OPERATOR_USERNAME` | web | Gizli | Operatör paneli Basic Auth kullanıcı adı ([AP-002]) |
| `OPERATOR_PASSWORD` | web | Gizli | Operatör paneli Basic Auth şifresi ([AP-002]) |
| `APP_ORIGIN` | web | Public | Production frontend origin'i (örn. `https://terazi.vercel.app`) — `next.config.ts` `headers()`'daki CORS `Access-Control-Allow-Origin` değeri için kullanılır ([SEC-004]); tanımsızsa header hiç eklenmez (wildcard'a düşülmez) |
| `NODE_ENV` | web, worker | Public | `development` \| `staging` \| `production` |
| `LOG_LEVEL` | web, worker | Public | Varsayılan `info`, local'de `debug` |

Tüm değişkenler `.env.example` içinde placeholder değerlerle dokümante edilir; gerçek değerler kod tabanına asla girmez, Vercel/Railway'in kendi secret store'u üzerinden enjekte edilir ([SEC-003]).

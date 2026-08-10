# 03. API Sözleşmeleri — Terazi

## 1. Genel Sözleşme

- **Base path:** `/api` — Next.js App Router API routes (`apps/web/app/api/**`).
- **Versiyonlama:** Yoktur. API'nin tek tüketicisi kendi frontend'idir ([TS-003]); versiyon prefix'i (`/v1`) eklemek bu ölçekte gereksiz karmaşıklıktır. İleride harici bir tüketici eklenirse, o zaman `/api/v2` ile yeni bir sözleşme başlatılır, mevcut path'ler geriye dönük kırılmaz.
- **Content type:** Tüm istek/yanıt gövdeleri `application/json; charset=utf-8`. Hiçbir endpoint `multipart/form-data` veya dosya yükleme kabul etmez (ürünün dosya yükleme özelliği yoktur).
- **HTTP metodları:** Yalnızca `GET` (tüm public endpoint'ler read-only, [P-009]). Operatör paneli endpoint'leri de salt okunurdur — job'ları tetikleyen/durduran bir yazma endpoint'i v1 kapsamında yoktur (worker yalnızca cron ile tetiklenir, bkz. `04_BACKEND_SPEC.md`).
- **Pagination:** Yoktur. Hiçbir liste yanıtı (varlık listesi, fon listesi, job run geçmişi) sayfalama gerektirecek büyüklükte değildir (en fazla birkaç yüz satır, [S-001]); `job_runs` endpoint'i sabit bir `limit` parametresiyle (varsayılan 50, maksimum 200) sınırlanır, sayfa/offset mekanizması kurulmaz.
- **Zaman formatı:** Tüm tarihler ISO 8601 (`YYYY-MM-DD` için `as_of_date`, `YYYY-MM-DDTHH:mm:ssZ` için zaman damgaları), UTC.
- **Sayısal alanlar:** Fiyat ve getiri alanları JSON'da **string** olarak serileştirilir (`"1234.567890"`), asla `number` olarak değil — JavaScript `number` IEEE-754 float'tır ve `DECIMAL` hassasiyetini bozar ([TS-006]). Frontend bu string'leri yalnızca gösterim anında formatlar, hesaplama yapmaz (hesaplama zaten backend'de bitmiştir).

## 2. Response Envelope

Tüm başarılı yanıtlar aynı zarfı kullanır:

```json
{
  "data": { },
  "meta": {
    "requestId": "a1b2c3d4",
    "generatedAt": "2026-08-10T12:00:00Z"
  }
}
```

- `data`: endpoint'e özgü payload (obje veya dizi).
- `meta.requestId`: her istek için üretilen, log korelasyonu için kullanılan rastgele kimlik (loglara da yazılır, bkz. `04_BACKEND_SPEC.md §9`).
- `meta.generatedAt`: yanıtın üretildiği sunucu zamanı — istemcinin "bu veri ne zaman hesaplandı" bilgisini `as_of_date`'ten ayrı olarak görebilmesi için (tazelik farkını göstermek amacıyla, bkz. Terminoloji Kilidi).

Hata yanıtları:

```json
{
  "error": {
    "code": "INVALID_PERIOD",
    "message": "Geçersiz dönem değeri.",
    "details": { "field": "period", "received": "10y" }
  },
  "meta": {
    "requestId": "a1b2c3d4",
    "generatedAt": "2026-08-10T12:00:00Z"
  }
}
```

- `error.code`: makine tarafından işlenebilir sabit sözlük (bkz. §3).
- `error.message`: kullanıcıya gösterilebilir, **Türkçe** mesaj (frontend başka bir çeviri katmanı kurmaz, mesaj doğrudan gösterilir).
- `error.details`: opsiyonel, hangi alanın/değerin hataya yol açtığını gösteren yapılandırılmış ek bilgi (validation hatalarında zorunlu).

## 3. Error Taxonomy

| `error.code` | HTTP Status | Anlamı | Mesaj politikası |
| --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Query parametresi şema doğrulamasından geçemedi ([SEC-006]) | `details.field` + `details.received` her zaman dolu |
| `INVALID_PERIOD` | 400 | `period` sabit enum (`1m`,`3m`,`1y`,`3y`,`5y`) dışında bir değer | — |
| `INVALID_ASSET_SELECTION` | 400 | Grafik endpoint'i için seçilen varlık sayısı 2'den az veya 5'ten fazla | `details.count` |
| `ASSET_NOT_FOUND` | 404 | Verilen `symbol`, `assets` tablosunda `is_active=true` olarak bulunamadı | — |
| `DATA_UNAVAILABLE` | 200 (hata değil, kısmi veri) | İstenen varlık/dönem kombinasyonu için `AssetPrice`/`CpiIndex` eksik ([DOMAIN §4.3]) | Satır bazında `data.rows[].status="unavailable"` ile işaretlenir, HTTP 200 döner — bu bir hata değil, beklenen bir veri durumudur |
| `UNAUTHORIZED` | 401 | `/api/admin/*` için Basic Auth header eksik/hatalı | `WWW-Authenticate: Basic realm="Terazi Operator Panel"` header'ı ile birlikte |
| `RATE_LIMITED` | 429 | IP bazlı rate limit aşıldı ([SEC-005]) | `Retry-After` header'ı ile birlikte |
| `INTERNAL_ERROR` | 500 | Beklenmeyen sunucu hatası | Mesaj jenerik tutulur ("Beklenmeyen bir hata oluştu."), stack trace asla client'a sızmaz |

**Not:** `DATA_UNAVAILABLE` bir HTTP hata kodu değildir — [DOMAIN §4.3]'teki "eksikse veri yok gösterilir, tahmini üretilmez" kuralının API karşılığıdır; kısmi veri durumu satır seviyesinde `status` alanıyla taşınır, tüm isteği başarısız kılmaz.

## 4. Auth Başlıkları / Cookie Sözleşmesi

- **Public endpoint'ler** (`/api/assets`, `/api/asset-classes`, `/api/comparison`, `/api/comparison/series`, `/api/health`): auth header gerektirmez, cookie kullanılmaz (oturum kavramı yok, [P-002]).
- **Operatör endpoint'leri** (`/api/admin/*`): `Authorization: Basic <base64(username:password)>` header'ı zorunludur. Kimlik bilgisi `OPERATOR_USERNAME`/`OPERATOR_PASSWORD` ortam değişkenleriyle karşılaştırılır ([AP-002], [SEC-003]). Başarısız denemede `401` + `WWW-Authenticate` header'ı döner, tarayıcı native Basic Auth diyaloğunu gösterir. Cookie/token/session mekanizması kurulmaz — her istek kendi header'ını taşır (stateless).

## 5. Endpoint Kataloğu

### 5.1 Grup: Referans Veri

#### `GET /api/asset-classes`

- **Yetki:** Herkese açık.
- **Amaç:** Filtre UI'sinde gösterilecek varlık sınıfı listesi.
- **Request:** Parametre yok.
- **Response `data`:**
```json
[
  { "code": "fx", "nameTr": "Döviz", "sortOrder": 1 },
  { "code": "gold", "nameTr": "Altın", "sortOrder": 2 },
  { "code": "crypto", "nameTr": "Kripto Para", "sortOrder": 3 },
  { "code": "fund", "nameTr": "Yatırım Fonu", "sortOrder": 4 }
]
```
- **Hata kodları:** `INTERNAL_ERROR`.
- **Cache:** `Cache-Control: public, max-age=86400` — bu veri pratikte hiç değişmez.

#### `GET /api/assets`

- **Yetki:** Herkese açık.
- **Amaç:** Varlık seçici (dropdown/multi-select) için aktif varlık listesi.
- **Query parametreleri:**

| Param | Tip | Zorunlu | Açıklama |
| --- | --- | --- | --- |
| `assetClass` | `enum(fx,gold,crypto,fund)` | Hayır | Belirtilirse yalnızca o sınıftaki varlıklar döner |

- **Response `data`:**
```json
[
  { "symbol": "USDTRY", "nameTr": "Amerikan Doları", "assetClass": "fx" },
  { "symbol": "BTC", "nameTr": "Bitcoin", "assetClass": "crypto" }
]
```
- **Hata kodları:** `VALIDATION_ERROR` (geçersiz `assetClass`), `INTERNAL_ERROR`.
- **Cache:** `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.

### 5.2 Grup: Karşılaştırma

#### `GET /api/comparison`

- **Yetki:** Herkese açık.
- **Amaç:** Ana karşılaştırma tablosunun veri kaynağı — [P-007]'deki nominal getiri, reel getiri, dönem başı/sonu fiyat, `as_of_date` kolonlarını üretir.
- **Query parametreleri:**

| Param | Tip | Zorunlu | Açıklama |
| --- | --- | --- | --- |
| `assets` | `string` (virgülle ayrılmış symbol listesi) | Hayır | Boşsa tüm aktif varlıklar döner |
| `period` | `enum(1m,3m,1y,3y,5y)` | Evet | Karşılaştırma dönemi |
| `sortBy` | `enum(realReturn,nominalReturn,symbol)` | Hayır, varsayılan `realReturn` | Sıralama alanı |
| `sortDir` | `enum(asc,desc)` | Hayır, varsayılan `desc` | Sıralama yönü |

- **Response `data`:**
```json
{
  "period": "1y",
  "rows": [
    {
      "symbol": "USDTRY",
      "assetClass": "fx",
      "status": "ok",
      "startPrice": "32.150000",
      "endPrice": "34.820000",
      "startDate": "2025-08-10",
      "endDate": "2026-08-10",
      "nominalReturn": "0.083047",
      "realReturn": "-0.021500",
      "asOfDate": "2026-08-10"
    },
    {
      "symbol": "TEFAS:AFA",
      "assetClass": "fund",
      "status": "unavailable",
      "startPrice": null,
      "endPrice": null,
      "startDate": null,
      "endDate": null,
      "nominalReturn": null,
      "realReturn": null,
      "asOfDate": null
    }
  ]
}
```
- **Alan kuralları:** `nominalReturn`/`realReturn` ondalık oran olarak string döner (`0.083047` = %8.3047), yüzdeye çevirme frontend'de yapılır. `status="unavailable"` olan satırlarda diğer tüm sayısal alanlar `null`'dır.
- **Hata kodları:** `VALIDATION_ERROR`, `INVALID_PERIOD`, `INTERNAL_ERROR`.
- **Cache:** `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` (döviz/altın/fon ağırlıklı); yanıt en az bir `crypto` varlığı içeriyorsa `max-age=300, stale-while-revalidate=3600` uygulanır.

#### `GET /api/comparison/series`

- **Yetki:** Herkese açık.
- **Amaç:** Normalize edilmiş (100 bazlı) getiri grafiğinin veri kaynağı.
- **Query parametreleri:**

| Param | Tip | Zorunlu | Açıklama |
| --- | --- | --- | --- |
| `assets` | `string` (virgülle ayrılmış symbol listesi, 2–5 adet) | Evet | Grafikte gösterilecek varlıklar |
| `period` | `enum(1m,3m,1y,3y,5y)` | Evet | — |

- **Response `data`:**
```json
{
  "period": "1y",
  "series": [
    {
      "symbol": "USDTRY",
      "points": [
        { "date": "2025-08-10", "value": "100.000000" },
        { "date": "2025-09-10", "value": "102.410000" }
      ]
    }
  ]
}
```
- **Hata kodları:** `VALIDATION_ERROR`, `INVALID_ASSET_SELECTION` (2'den az/5'ten fazla varlık), `INVALID_PERIOD`, `INTERNAL_ERROR`.
- **Cache:** `/api/comparison` ile aynı politika.

### 5.3 Grup: Operatör Paneli (`/api/admin/*`)

Tüm bu grup `Authorization: Basic` header'ı gerektirir (bkz. §4). Header eksik/hatalıysa tüm endpoint'ler `401 UNAUTHORIZED` döner.

#### `GET /api/admin/job-runs`

- **Amaç:** Son worker çalıştırmalarının listesi (operatör panelinin ana tablosu).
- **Query parametreleri:**

| Param | Tip | Zorunlu | Açıklama |
| --- | --- | --- | --- |
| `dataSource` | `enum(tcmb,tefas,coingecko)` | Hayır | Belirtilirse yalnızca o kaynağın çalıştırmaları döner |
| `limit` | `integer, 1–200` | Hayır, varsayılan 50 | Dönecek maksimum kayıt sayısı |

- **Response `data`:**
```json
[
  {
    "id": 1042,
    "dataSource": "tefas",
    "status": "partial",
    "startedAt": "2026-08-10T15:30:02Z",
    "finishedAt": "2026-08-10T15:31:47Z",
    "recordsUpserted": 58,
    "errorMessage": "2 kayıt şema doğrulamasından geçemedi: beklenmeyen fiyat tipi (fon kodu XYZ, ABC)"
  }
]
```
- **Hata kodları:** `UNAUTHORIZED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
- **Cache:** `Cache-Control: no-store` — operatör her zaman en güncel durumu görmeli.

#### `GET /api/admin/sources`

- **Amaç:** Her veri kaynağının sağlık özeti (son başarılı çalışma zamanı, mevcut durum).
- **Response `data`:**
```json
[
  {
    "dataSource": "tcmb",
    "lastSuccessAt": "2026-08-10T18:32:10Z",
    "lastRunStatus": "success",
    "isStale": false
  },
  {
    "dataSource": "tefas",
    "lastSuccessAt": "2026-08-09T18:35:00Z",
    "lastRunStatus": "failed",
    "isStale": true
  }
]
```
- **`isStale` kuralı:** Kaynağın beklenen güncelleme takviminden (tcmb/tefas: 1 iş günü, coingecko: 8 saat) daha uzun süredir başarılı çalışma yoksa `true`.
- **Hata kodları:** `UNAUTHORIZED`, `INTERNAL_ERROR`.
- **Cache:** `Cache-Control: no-store`.

### 5.4 Grup: Altyapı

#### `GET /api/health`

- **Yetki:** Herkese açık (hosting platformunun health check mekanizması için).
- **Amaç:** Uygulamanın ve veritabanı bağlantısının ayakta olduğunu doğrulamak.
- **Response `data`:** `{ "status": "ok", "database": "ok" }`
- **Hata kodları:** Veritabanı bağlantısı başarısızsa `503` + `{ "status": "degraded", "database": "error" }` (bu tek endpoint response envelope'unu kullanmaz, düz JSON döner — hosting platformlarının health check parser'ları genelde sade yanıt bekler).
- **Cache:** `Cache-Control: no-store`.

## 6. Rate Limit ve Kota Kuralları

| Kapsam | Limit | Aşım davranışı |
| --- | --- | --- |
| Genel public API (`/api/assets`, `/api/comparison`, `/api/comparison/series`, `/api/asset-classes`) | IP başına dakikada 60 istek | `429 RATE_LIMITED` + `Retry-After` header |
| `/api/admin/*` genel istekler | IP başına dakikada 60 istek (aynı genel limit) | `429 RATE_LIMITED` |
| `/api/admin/*` başarısız Basic Auth denemesi | IP başına dakikada 10 deneme | Limit aşılırsa doğru kimlik bilgisiyle bile `429` döner (brute-force penceresi kapatma) |
| `/api/health` | Limit yok | Hosting platformunun health check'i sık çağırabilir, kısıtlanmaz |

Rate limit sayaçları uygulama içi bellek (in-memory, tek worker instance varsayımıyla — [S-001] ölçeğinde yatay ölçekleme yoktur) veya hosting platformunun edge katmanı ile tutulur; ayrı bir Redis kurulmaz ([INF-006] ile tutarlı).

## 7. Idempotency ve Retry Semantiği

Tüm public ve admin endpoint'ler `GET` olduğu için doğaları gereği idempotenttir — aynı istek tekrar edildiğinde yan etki oluşmaz, aynı sonuç döner (kaynak veri değişmediği sürece). Ayrı bir idempotency-key mekanizması gerekmez.

Worker job'larının idempotency'si (aynı gün için tekrar çalıştırıldığında veri kopyalanmaması) API katmanının değil, veritabanı `UNIQUE` kısıtının ve upsert mantığının sorumluluğudur (bkz. `02_DATABASE_SCHEMA.md §2.3`, `04_BACKEND_SPEC.md §8`).

Frontend tarafında retry: `fetch` başarısız olursa (`5xx`, network hatası) bir kez otomatik retry yapılır (exponential backoff yok, sabit 1 saniye bekleme); ikinci hata kullanıcıya hata state'i olarak gösterilir (bkz. `05_FRONTEND_SPEC.md`).

## 8. Webhook / Callback Sözleşmeleri

Yoktur. Terazi hiçbir dış sisteme veri göndermez, hiçbir dış sistemden webhook almaz ([P-008] — bildirim sistemi kapsam dışı).

## 9. SLA ve Performans Hedefleri

| Endpoint grubu | Hedef p95 yanıt süresi | Not |
| --- | --- | --- |
| `/api/asset-classes`, `/api/assets` | < 100ms | Küçük, index'li sorgular; CDN cache ile çoğu istek origin'e bile gitmez |
| `/api/comparison`, `/api/comparison/series` | < 400ms | Reel getiri hesaplaması istek anında yapılır (`packages/core`), veri önceden hesaplanmış değildir |
| `/api/admin/*` | < 300ms | `no-store`, her istek origin'e gider ama veri hacmi küçüktür |
| `/api/health` | < 50ms | Basit bağlantı kontrolü |

Bu hedefler [S-001]'deki düşük trafik varsayımı altında tanımlanmıştır; bir SLA ihlali durumunda otomatik alarm/on-call süreci v1 kapsamında yoktur ([INF-003] — DB-içi `job_runs` gözlemlenebilirliği yeterli kabul edilir).

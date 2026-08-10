# 02. Veritabanı Şeması — Terazi

## 1. Şema Genel Bakış ve İsimlendirme Konvansiyonu

Veritabanı PostgreSQL 16+, erişim Prisma ORM üzerinden yapılır. Şema 5 tablodan oluşur: 2 referans/lookup tablosu (`asset_classes`), 1 ana varlık tablosu (`assets`), 2 zaman serisi tablosu (`asset_prices`, `cpi_index`) ve 1 operasyonel tablo (`job_runs`).

**İsimlendirme kuralları:**
- Tablo adları: `snake_case`, çoğul (`assets`, `asset_prices`, `job_runs`).
- Kolon adları: `snake_case` (`as_of_date`, `is_active`).
- Primary key: her tabloda `id BIGSERIAL PRIMARY KEY`.
- Foreign key kolonu: `<referans_tablo_tekil>_id` (`asset_class_id`, `asset_id`).
- Zaman damgası kolonları: `created_at`, `updated_at` — ikisi de `TIMESTAMPTZ`, UTC saklanır.
- Enum-benzeri kısıtlı metin alanları Postgres native `ENUM` tipi yerine `VARCHAR` + `CHECK (col IN (...))` ile modellenir — yeni bir değer eklemek (`ALTER TYPE` yerine) tek satırlık bir `CHECK` migration'ı gerektirir, bu Prisma Migrate ile daha az sürtünmelidir.
- Para/fiyat alanları daima `NUMERIC(p,s)`; hiçbir alan `FLOAT`/`DOUBLE PRECISION` olamaz ([TS-006]).

## 2. Tablo Tanımları

### 2.1 `asset_classes`

| Kolon | Tip | Null | Default | Açıklama |
| --- | --- | --- | --- | --- |
| `id` | `BIGSERIAL` | NO | — | Primary key |
| `code` | `VARCHAR(20)` | NO | — | `fx` \| `gold` \| `crypto` \| `fund` — `UNIQUE`, `CHECK` ile kısıtlı |
| `name_tr` | `VARCHAR(50)` | NO | — | Kullanıcıya gösterilen Türkçe ad (örn. "Döviz") |
| `sort_order` | `SMALLINT` | NO | `0` | Karşılaştırma tablosunda/filtre listesinde gösterim sırası |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | Oluşturulma zamanı |

**Constraint:** `CHECK (code IN ('fx','gold','crypto','fund'))`

### 2.2 `assets`

| Kolon | Tip | Null | Default | Açıklama |
| --- | --- | --- | --- | --- |
| `id` | `BIGSERIAL` | NO | — | Primary key |
| `asset_class_id` | `BIGINT` | NO | — | FK → `asset_classes.id` |
| `symbol` | `VARCHAR(30)` | NO | — | Benzersiz kısa kod (`USDTRY`, `XAUTRY`, `BTC`, `TEFAS:AFA`) — `UNIQUE` |
| `name_tr` | `VARCHAR(120)` | NO | — | Kullanıcıya gösterilen ad ("Amerikan Doları", "Ata Portföy Hisse Senedi Fonu") |
| `data_source` | `VARCHAR(20)` | NO | — | `tcmb` \| `tefas` \| `coingecko` — `CHECK` ile kısıtlı |
| `external_ref` | `VARCHAR(60)` | NO | — | Kaynak API'deki kimlik (TCMB EVDS seri kodu, TEFAS fon kodu, CoinGecko coin id) |
| `currency` | `VARCHAR(3)` | NO | `'TRY'` | Fiyatın ifade edildiği para birimi (v1'de her zaman TRY) |
| `is_active` | `BOOLEAN` | NO | `true` | Karşılaştırma tablosunda gösterilip gösterilmeyeceği (bkz. §7 soft-delete) |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Seed güncellemesinde (örn. `is_active` değişimi) değişir |

**Constraint:** `CHECK (data_source IN ('tcmb','tefas','coingecko'))`, `UNIQUE (symbol)`

### 2.3 `asset_prices`

| Kolon | Tip | Null | Default | Açıklama |
| --- | --- | --- | --- | --- |
| `id` | `BIGSERIAL` | NO | — | Primary key |
| `asset_id` | `BIGINT` | NO | — | FK → `assets.id` |
| `as_of_date` | `DATE` | NO | — | Fiyatın ait olduğu gerçek tarih |
| `price` | `NUMERIC(20,6)` | NO | — | TL cinsinden fiyat, `CHECK (price > 0)` |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | İlk yazım zamanı |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Upsert ile revize edilirse güncellenir |

**Constraint:** `UNIQUE (asset_id, as_of_date)` — [I-005]'teki idempotent upsert kuralının veritabanı seviyesinde garantisi.

### 2.4 `cpi_index`

| Kolon | Tip | Null | Default | Açıklama |
| --- | --- | --- | --- | --- |
| `id` | `BIGSERIAL` | NO | — | Primary key |
| `period_month` | `CHAR(7)` | NO | — | `'YYYY-MM'` formatında ay, `UNIQUE` |
| `index_value` | `NUMERIC(12,4)` | NO | — | TÜFE endeks değeri, `CHECK (index_value > 0)` |
| `as_of_date` | `DATE` | NO | — | TCMB EVDS'nin değeri yayımladığı gerçek tarih |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | — |

### 2.5 `job_runs`

| Kolon | Tip | Null | Default | Açıklama |
| --- | --- | --- | --- | --- |
| `id` | `BIGSERIAL` | NO | — | Primary key |
| `data_source` | `VARCHAR(20)` | NO | — | `tcmb` \| `tefas` \| `coingecko` |
| `status` | `VARCHAR(10)` | NO | `'pending'` | `pending` \| `running` \| `success` \| `partial` \| `failed` — bkz. `01_DOMAIN_MODEL.md §5` |
| `started_at` | `TIMESTAMPTZ` | YES | `NULL` | `running`'e geçince doldurulur |
| `finished_at` | `TIMESTAMPTZ` | YES | `NULL` | Terminal duruma geçince doldurulur |
| `records_upserted` | `INTEGER` | NO | `0` | Başarıyla yazılan kayıt sayısı |
| `error_message` | `TEXT` | YES | `NULL` | `partial`/`failed` durumunda hata özeti |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | Kayıt oluşturulma (job tetiklenme) zamanı |

**Constraint:** `CHECK (data_source IN ('tcmb','tefas','coingecko'))`, `CHECK (status IN ('pending','running','success','partial','failed'))`

## 3. Enum ve Lookup Tabloları

- `asset_classes` tek gerçek lookup tablosudur — 4 satırlık statik referans verisi, seed ile yönetilir.
- `assets.data_source`, `job_runs.data_source`, `job_runs.status` ayrı tablo yerine `VARCHAR + CHECK` ile modellenmiştir (bkz. §1 gerekçesi). Bu değerlerin kod tarafındaki tekil kaynağı `packages/core` içindeki Zod enum şemalarıdır — DB `CHECK` kısıtı ile Zod enum'u her zaman senkron tutulur; biri değişirse diğeri aynı PR'da güncellenir.

## 4. Index Stratejisi

| Tablo | Index | Amaç |
| --- | --- | --- |
| `assets` | `UNIQUE (symbol)` | Sembol ile hızlı arama (API'de varlık seçimi) |
| `assets` | `INDEX (asset_class_id)` | Sınıf bazlı filtreleme (karşılaştırma tablosu varlık listesi) |
| `assets` | `INDEX (is_active) WHERE is_active = true` (partial index) | Aktif varlık listesi sorgusu — küçük ve sık çalışan sorgu için |
| `asset_prices` | `UNIQUE (asset_id, as_of_date)` | İdempotent upsert garantisi + `(asset_id, as_of_date)` ile nokta sorgusu |
| `asset_prices` | `INDEX (asset_id, as_of_date DESC)` | Dönem bazlı aralık sorgusu ("son 5 yıl fiyat serisi") — en sık çalışan sorgu deseni |
| `cpi_index` | `UNIQUE (period_month)` | Ay bazlı nokta sorgusu |
| `job_runs` | `INDEX (data_source, started_at DESC)` | Operatör panelinde "kaynak başına son çalışma" sorgusu |

Ayrı bir full-text veya composite covering index gerekmez; sorgu hacmi ([S-001]) ve veri boyutu (birkaç bin `asset_prices` satırı/varlık × birkaç düzine varlık) bu ölçekte B-tree index'leri yeterli kılar.

## 5. İlişkiler ve Referans Bütünlüğü

| İlişki | Kardinalite | `ON DELETE` | `ON UPDATE` | Gerekçe |
| --- | --- | --- | --- | --- |
| `assets.asset_class_id → asset_classes.id` | N:1, zorunlu | `RESTRICT` | `CASCADE` | Altında varlık olan bir sınıf yanlışlıkla silinemez; sınıf silinmeden önce tüm varlıkları taşınmalı/pasife alınmalıdır |
| `asset_prices.asset_id → assets.id` | N:1, zorunlu | `CASCADE` | `CASCADE` | Pratikte `assets` satırları fiziksel olarak silinmez (`is_active=false` kullanılır, bkz. §7), bu yüzden cascade tetiklenmesi beklenmez; yine de veri bütünlüğü için tanımlanır |

`cpi_index` ve `job_runs`, diğer tablolara FK ile bağlı değildir — bağımsız zaman serileridir, eşleştirme hesaplama zamanında tarih üzerinden yapılır (bkz. `01_DOMAIN_MODEL.md §6`).

## 6. Şifrelenmiş / Maskelenen Alanlar

**Yok.** [SEC-002]'deki veri sınıflandırmasına göre bu şemadaki tüm alanlar **Public** sınıfındadır (piyasa/fiyat verisi, herkese açık). **Gizli** sınıfa giren tek veri (dış API key'leri, operatör paneli credential'ı) veritabanında değil, ortam değişkenlerinde tutulur ([SEC-003]) — bu şemanın hiçbir tablosunda secret/credential kolonu yoktur. KVKK'ya konu kişisel veri de bulunmaz ([P-002], [SEC-002]).

## 7. Audit ve Soft-Delete Kolonları

- **Soft-delete yalnızca `assets.is_active`'te vardır.** Bir varlık artık takip edilmeyecekse satır silinmez, `is_active=false` yapılır — bağlı `asset_prices` geçmişi korunur.
- **`asset_prices` ve `cpi_index` append-only'dir**, soft-delete kolonu yoktur çünkü hiçbir zaman silinmezler; yalnızca `(asset_id, as_of_date)` / `period_month` eşleşmesinde upsert edilirler.
- **`job_runs` da append-only'dir**, silme veya soft-delete yoktur; küçük ölçek ([S-001]) nedeniyle bir saklama/temizlik politikası v1'de tanımlanmaz.
- **Klasik audit log tablosu (kim-ne-yaptı) bu şemada yoktur** — sistemde kullanıcı hesabı/eylemi olmadığı için ([P-002]) konusu yoktur. Worker çalışma geçmişi `job_runs` ile karşılanır, bu operasyonel bir kayıttır, klasik audit log değildir.

## 8. Migration Stratejisi

- Migration'lar Prisma Migrate ile üretilir: `prisma migrate dev --name <açıklayıcı_isim>`. Dosya adlandırma Prisma'nın kendi `YYYYMMDDHHMMSS_<açıklayıcı_isim>` konvansiyonuna bırakılır, elle isimlendirme yapılmaz.
- Her migration PR'da diff olarak review edilir; `schema.prisma` değişikliği olmadan elle SQL migration yazılmaz.
- **Geri alma politikası:** Prisma native bir "down migration" üretmez. Üretimde bir migration hatalıysa, geri alma yeni bir "forward-fix" migration'ı ile yapılır (eski migration silinmez/değiştirilmez) — production veritabanının migration geçmişi asla elle düzenlenmez.
- **Veri migration kuralı:** Şema değişikliği mevcut veriyi dönüştürmeyi gerektiriyorsa (örn. bir kolonun tipi değişiyor), aynı migration dosyası içinde önce yeni kolon eklenir, veri dönüştürülür, eski kolon bir sonraki migration'da kaldırılır (iki adımlı, geri dönüşü olan genişlet-daralt deseni).
- Migration'lar CI'da (`INF-002`) `prisma migrate deploy --dry-run` benzeri bir doğrulama adımından geçer; staging ortamına merge öncesi otomatik uygulanır ([INF-005]).

## 9. Seed Verisi

| Ortam | Seed kapsamı |
| --- | --- |
| **local** | Tam seed: 4 `asset_classes` + tüm `assets` (USD/TRY, EUR/TRY, XAUTRY, BTC, ETH, SOL, BNB, XRP + TEFAS'taki 4 kategoriden kategori başına 15 fon) + `08_TESTING_STRATEGY.md`'deki fixture'lardan üretilmiş örnek `asset_prices`/`cpi_index` verisi |
| **staging** | Aynı `asset_classes`/`assets` seed'i; `asset_prices`/`cpi_index` gerçek worker job'ları tarafından doldurulur (fixture kullanılmaz) |
| **production** | Aynı `asset_classes`/`assets` seed'i, tek seferlik ve operatör onayıyla çalıştırılır; sonrasında yalnızca worker job'ları veri yazar |

Seed script'i (`packages/core` veya `apps/worker` altında, konum `04_BACKEND_SPEC.md`'de netleşir) idempotenttir — tekrar çalıştırıldığında `asset_classes`/`assets` için var olan `symbol`/`code` üzerinden upsert yapar, çoğaltma oluşturmaz.

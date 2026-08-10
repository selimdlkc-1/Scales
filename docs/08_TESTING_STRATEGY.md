# 08. Test Stratejisi — Terazi

## 1. Test Piramidi ve Katman Sorumlulukları

| Katman | Kapsam | Araç | Sorumluluk |
| --- | --- | --- | --- |
| **Unit** | `packages/core` — hesaplama fonksiyonları (`real-return.ts`, `normalized-return.ts`), Zod şemaları | Vitest | Reel getiri, TÜFE arındırma, normalize edilmiş getiri formüllerinin matematiksel doğruluğu; şema doğrulamasının doğru kabul/red kararı vermesi |
| **Integration** | `apps/web` API route'ları, `apps/worker` job'ları | Vitest + test veritabanı | Route handler'ın doğru servis/repository'yi çağırıp doğru HTTP yanıtını/DB satırını ürettiği; worker job'unun fixture yanıtından doğru `AssetPrice`/`JobRun` satırlarını yazdığı |
| **Smoke E2E** | `apps/web` — kritik kullanıcı akışları | Playwright | Sayfanın gerçekten yüklendiği, temel etkileşimin çalıştığı (kapsamlı UI test değildir) |

[P-004] ilkesi gereği ("veri katmanı kalitesi UI'dan önemli") test yatırımı ağırlıklı olarak unit ve integration katmanına yoğunlaşır; e2e yalnızca birkaç kritik akışla sınırlıdır.

## 2. Coverage Hedefleri

| Katman | Hedef |
| --- | --- |
| `packages/core` (hesaplama fonksiyonları + şemalar) | **%90+** |
| `apps/web` (routing, servis, repository) | **%60+** |
| `apps/worker` (job, client, servis) | **%60+** |

Coverage `vitest --coverage` (v8 provider) ile ölçülür ve CI'da (§7) bu eşiklerin altına düşen bir PR merge edilemez.

## 3. Kritik Modül Tanımı

Aşağıdaki modüller "kritik" kabul edilir — %90+ eşiği yalnızca bunlar için değil, **her yeni fonksiyon eklendiğinde** korunması gereken bir alt sınırdır ([CODE-001] madde 5):

- `packages/core/src/calculations/real-return.ts` — reel getiri formülü ([DOMAIN §6])
- `packages/core/src/calculations/normalized-return.ts` — grafik verisi formülü
- `packages/core/src/schemas/external/*.ts` — dış kaynak doğrulama şemaları ([SEC-007])
- `apps/worker/src/jobs/*.ts` — idempotent upsert mantığı ([I-005])

Bu dört grup, hatalı bir sonucun kullanıcıya doğrudan yanlış finansal bilgi olarak ulaşabileceği veya kırılgan bir dış kaynaktan (TEFAS) bozuk veri sızabileceği tek yerlerdir; bu yüzden diğer modüllerden daha katı test disiplinine tabidir.

## 4. Zorunlu Negatif/Deny Senaryoları

Her PR'da aşağıdaki senaryo grupları için en az bir test bulunmalıdır (kod review checklist'inin bir parçası, [CODE-005]):

| Senaryo | Beklenen davranış | Test katmanı |
| --- | --- | --- |
| Sıfıra bölme / eksik başlangıç fiyatı | `real-return.ts` hata fırlatmaz, `null`/`unavailable` döner, exception ile process çökmez | Unit |
| Dış kaynak yanıtında eksik/beklenmeyen tip alan | Zod şeması reddeder, job kaydı atlar, `JobRun.status='partial'` olur, işlem durmaz | Integration |
| Geçersiz `period`/`assetClass` query parametresi | `400 VALIDATION_ERROR`, sunucu çökmez | Integration |
| 6. varlık ile grafik isteği | `400 INVALID_ASSET_SELECTION` | Integration |
| `/api/admin/*`'e `Authorization` header'sız istek | `401 UNAUTHORIZED` | Integration |
| Rate limit eşiği aşımı | `429 RATE_LIMITED` | Integration |
| Aynı `(asset_id, as_of_date)` için job'un iki kez çalıştırılması | Veri çoğalmaz, tek satır upsert edilir | Integration |

## 5. Test Verisi ve Factory/Fixture Stratejisi

- Testler ve lokal geliştirme, TCMB EVDS / TEFAS / CoinGecko yanıtlarının **sabit fixture JSON'larıyla** çalışır (`apps/worker/src/jobs/__fixtures__/`). Gerçek dış API'lere test sırasında **asla** gidilmez.
- Fixture'lar hem "iyi huylu" (geçerli, tam) hem de **"bozuk veri"** senaryolarını içerir — eksik alan, beklenmeyen tip, boş dizi, TEFAS'a özgü ondalık ayraç varyasyonları. Bu, [SEC-007]'deki doğrulama katmanının gerçekten çalıştığını kanıtlamak içindir.
- Integration testler için test veritabanı: Docker Compose ile ayağa kaldırılan izole bir PostgreSQL instance'ı; her test dosyası kendi transaction'ını açıp test sonunda rollback yapar (test'ler arası veri sızıntısı önlenir).
- Unit test verisi (örnek fiyat/TÜFE serileri) doğrudan test dosyası içinde literal olarak tanımlanır — ayrı bir factory kütüphanesi (`faker` vb.) gerekmez, çünkü girdi kümesi küçük ve deterministik olmalıdır (finansal hesap testinde rastgele veri yanıltıcıdır).

## 6. E2E Journey Listesi ve Risk Seviyeleri

| Journey | Adımlar | Risk seviyesi |
| --- | --- | --- |
| Ana sayfa yükleme ve tablo render | `/` aç → tablo satırlarının göründüğünü doğrula | Yüksek (ürünün temel değer önerisi) |
| Varlık seçimi ve grafik render | `/` aç → 3 varlık seç → grafiğin göründüğünü doğrula | Orta |
| Dönem değişikliği | `/` aç → dönem seçiciyi değiştir → tablo verisinin değiştiğini doğrula | Orta |
| Operatör paneli erişimi | `/admin`'e Basic Auth olmadan git → 401 diyaloğu tetiklendiğini doğrula; doğru credential ile gir → job tablosu göründüğünü doğrula | Düşük (iç kullanım, düşük trafik) |

Kapsamlı bir e2e matrisi (her filtre kombinasyonu, her ekran boyutu) kurulmaz — [TEST-001] gereği bu düzeyde detay unit/integration katmanında karşılanır, e2e yalnızca "uçtan uca gerçekten çalışıyor mu" sorusuna cevap verir.

## 7. CI Gate

GitHub Actions, her push/PR'da şu sırayla çalışır ([INF-002]):

1. **Lint** (ESLint + Prettier kontrolü) — hata varsa pipeline durur.
2. **Test** (Vitest unit + integration, coverage eşikleriyle birlikte) — herhangi bir test kırmızıysa veya coverage §2'deki eşiklerin altındaysa pipeline durur.
3. **Build** (`pnpm build` — hem `apps/web` hem `apps/worker`) — build hatası varsa pipeline durur.
4. **Dependency taraması** (Dependabot + `npm audit` veya pnpm eşdeğeri, [SEC-008]) — kritik/yüksek zafiyet varsa build uyarır (bloklamaz, ayrıca bir PR yorumu bırakır).

Playwright smoke e2e testleri CI'da ayrı bir job olarak çalışır (build'i bloklamaz, ancak main'e merge öncesi yeşil olması beklenir — [TEST-005]).

**Merge kuralı:** CI (lint + test + build) yeşil olsa dahi, main'e merge işlemi proje sahibinin açık onayını gerektirir ([TEST-005]) — agent CI yeşilliğini onay yerine geçirmez.

## 8. Test Adlandırma ve Dosya Yerleşimi

- Test dosyaları, test ettikleri dosyayla aynı klasörde, `.test.ts` uzantısıyla yaşar (`real-return.ts` → `real-return.test.ts`) — ayrı bir `__tests__/` klasör hiyerarşisi kurulmaz, kaynak ve test yan yana durur.
- Playwright e2e testleri `apps/web/e2e/*.spec.ts` altında toplanır (ayrı klasör — bunlar birim bazlı değil, sayfa/akış bazlıdır).
- Test adı deseni: `describe('<modül/fonksiyon adı>')` → `it('<beklenen davranış, doğal dilde>')`, örn. `it('sıfır başlangıç fiyatında null real_return döner')`. Test adı İngilizce kod içinde yazılır ama davranış açıklaması gerektiğinde Türkçe okunabilirlik tercih edilir (proje genelinde TR prosa + EN tanımlayıcı konvansiyonuyla tutarlı).

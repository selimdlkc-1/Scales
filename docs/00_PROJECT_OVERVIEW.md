# 00. Proje Genel Bakış — Terazi

## 1. Ürün Tanımı ve Değer Önerisi

Terazi; döviz (USD/TRY, EUR/TRY), gram altın, kripto para (BTC, ETH, SOL, BNB, XRP) ve TEFAS yatırım fonlarının **TL bazında, TÜFE ile enflasyondan arındırılmış reel getirilerini** tek bir tabloda ve normalize edilmiş bir grafikte karşılaştıran, **read-only** bir web uygulamasıdır.

Değer önerisi: Türkiye'de yatırımcının farklı varlık sınıflarını "nominal getiri" üzerinden karşılaştırması yanıltıcıdır — yüksek enflasyon ortamında nominal kazanç göstergesi gerçek satın alma gücü artışını yansıtmaz. Terazi bu karşılaştırmayı, tüm varlık sınıfları için tutarlı bir reel-getiri metodolojisiyle tek ekranda sunar.

Terazi bir **yatırım tavsiyesi aracı değildir**; yalnızca geçmiş veriyi gösterir ve karşılaştırır (bkz. §4, §6).

## 2. Ürün Modeli ve Platform Stratejisi

**Ürün modeli:** Tek-tenant ve hesapsızdır. Kullanıcı hesabı, oturum veya kişiselleştirme yoktur; tüm ziyaretçiler aynı genel/anonim veriye erişir. Sistemde tanımlı tek "yetkili taraf" operatördür (bkz. §3), o da uygulama içi bir hesap değil, ortam değişkeninde tutulan tek bir HTTP Basic Auth kimlik bilgisi setidir.

**Platform stratejisi:** Web-only, responsive tasarım. Native mobil uygulama v1 kapsamında değildir.

**Öncelik ilkesi:** Terazi bir vitrin/showcase çalışmasıdır; birincil amaç iş başvuru sürecinde teknik yetkinlik göstermektir. Trafik düşüktür (yüzlerce kullanıcı, ihmal edilebilir eşzamanlılık). Bu nedenle ürün geliştirme önceliği **ölçeklenebilirlik değil, veri katmanı kalitesi ve mühendislik pratikleridir**: idempotent job'lar, retry/backoff, graceful degradation, hesaplama fonksiyonları için gerçek unit test. UI cilası bu önceliklerin altındadır — çalışan, doğru ve test edilmiş bir veri katmanı, gösterişli ama kırılgan bir arayüzden daha değerlidir.

## 3. Hedef Kullanıcı Profilleri

Sistemde iki kullanıcı profili vardır; ikisi de klasik anlamda bir "hesap" veya "rol" değildir:

| Profil | Tanım | Erişim | Detay |
| --- | --- | --- | --- |
| **Anonim ziyaretçi** | Uygulamayı açan herkes | Karşılaştırma tablosu ve grafiğe tam erişim, kimlik doğrulama yok | Ekran detayları için `06_SCREEN_CATALOG.md` |
| **Operatör** | Veri toplama sisteminin sağlığını izleyen tek kişi (proje sahibi) | HTTP Basic Auth korumalı iç panel (`/admin`) | Güvenlik detayları için `07_SECURITY_IMPLEMENTATION.md` |

Klasik anlamda rol/yetki hiyerarşisi (superadmin, editor, viewer vb.) yoktur; bu iki profil dışında hiçbir ayrım genişletilmez.

## 4. MVP Kapsamı

### 4.1 Kapsam İçi (In-Scope)

- **Varlık sınıfları:**
  - Döviz: USD/TRY, EUR/TRY (kaynak: TCMB EVDS)
  - Emtia: gram altın (kaynak: TCMB EVDS)
  - Kripto: BTC, ETH, SOL, BNB, XRP (kaynak: CoinGecko)
  - Yatırım fonu: TEFAS'ta 4 şemsiye kategorisi altında (Hisse Senedi, Borçlanma Araçları, Altın/Kıymetli Madenler, Karışık/Değişken), kategori başına AUM'a göre ilk 15 fon
- **Dönem seçici:** 1 ay / 3 ay / 1 yıl / 3 yıl / 5 yıl (sabit seçenekler)
- **Karşılaştırma tablosu:** nominal getiri, reel getiri, dönem başı/sonu fiyat, veri tarihi (`as_of_date`) kolonları; sıralanabilir ve filtrelenebilir
- **Normalize edilmiş getiri grafiği:** seçilen 2–5 varlık için 100 bazlı endeksli çizgi grafiği
- **Veri toplama:** zamanlanmış worker job'ları dış kaynaklardan çekip kendi veritabanına yazar; kullanıcı isteği anında dış API'ye gidilmez
- **Operatör paneli:** veri toplama job'larının durumu ve kaynak sağlığı için minimal, HTTP Basic Auth korumalı iç ekran

### 4.2 Kapsam Dışı (Out-of-Scope)

- Kullanıcı hesabı, oturum, kimlik doğrulama, yetkilendirme, roller (anonim ziyaretçi dışında)
- Portföy takibi, kişisel varlık kaydı
- BIST hisse senedi verisi (lisans maliyeti nedeniyle bilinçli dışlama)
- Bildirim, alarm, e-posta
- Gerçek zamanlı fiyat akışı (kripto dahil — sayfa açıldığında en son DB durumu gösterilir, canlı push/polling yok)
- Al/sat sinyali, öneri motoru, sıralama bazlı tavsiye
- Çoklu dil (i18n) desteği
- Native mobil uygulama
- Üçüncü parti analytics veya hata izleme (error tracking) aracı

## 5. Başarı Kriterleri

Terazi bir vitrin projesi olduğu için başarı, kullanıcı büyüme metrikleriyle değil, **mühendislik kalitesiyle** ölçülür:

| Kriter | Hedef |
| --- | --- |
| `packages/core` (hesaplama fonksiyonları) test coverage | %90+ |
| `apps/web`, `apps/worker` test coverage | %60+ |
| Veri toplama job başarı oranı (haftalık ortalama) | %95+ (kaynak bazlı; TEFAS kırılganlığı payı ayrılarak) |
| Veri tazeliği | Her varlık sınıfı için `as_of_date`, ilgili kaynağın normal güncelleme takviminden (TCMB/TEFAS: T+1 iş günü, kripto: 4 saat) daha eski değilse "taze" kabul edilir |
| CI pipeline durumu | main branch'te sürekli yeşil (lint + test + build) |
| Sayfa performansı | Ana karşılaştırma ekranı için Core Web Vitals "iyi" eşiklerinde (bkz. `05_FRONTEND_SPEC.md`) |
| Yasal/ürün kısıtına uyum | Hiçbir ekranda tavsiye niteliğinde ifade veya sıralama-bazlı öneri bulunmaz (denetim: kod review checklist, bkz. `08_TESTING_STRATEGY.md`) |

## 6. Kısıtlar

- **Regülasyon:** SPK mevzuatına göre yatırım danışmanlığı lisansa tabi bir faaliyettir. Ürün hiçbir ekranda "al", "sat", "iyi seçenek", "önerilir" gibi tavsiye niteliğinde ifade veya sıralama-bazlı öneri üretmez; yalnızca geçmiş veriyi gösterir ve karşılaştırır. Her ekranda sabit olarak "geçmiş performans gelecekteki getiriyi göstermez" uyarısı bulunur. Bu bir yasal/ürün kısıtıdır, opsiyonel değildir.
- **Bütçe:** Tek geliştirici / portföy projesi ölçeğinde, ücretsiz veya düşük maliyetli hosting katmanları (Vercel, Railway) kullanılır; ayrı bir secret manager, APM/error-tracking servisi veya time-series veritabanı gibi ek maliyetli altyapı bileşenleri v1'de kurulmaz.
- **Ekip:** Tek geliştirici (+ kodlama agent'ı). Bu, mimari kararlarda karmaşıklık/fayda dengesinin sürekli sadelik lehine çözülmesinin sebebidir (örn. ayrı orkestrasyon katmanı yerine düz pnpm workspaces, tRPC yerine düz REST).
- **Süre/kapsam disiplini:** Herhangi bir yeni mimari karar gerektiren özellik eklenmeden önce ilgili karar dokümanı güncellenir; agent onaysız kapsam genişletmesi yapmaz.
- **Veri kaynağı kırılganlığı:** TEFAS kaynağı resmî olmayan, kırılgan bir arka uç endpoint'idir. Bu, mimari genelinde (idempotent job'lar, retry/backoff, graceful degradation, sıkı input validation) tekrar eden bir tasarım kısıtıdır.

## 7. Dil ve Yerelleştirme Politikası

- **Arayüz dili:** Türkçe. v1'de çoklu dil (i18n) altyapısı yoktur.
- **Kod tanımlayıcıları:** İngilizce (değişken, fonksiyon, tablo, kolon adları vb.).
- **Doküman dili:** Türkçe prosa, teknik terimler İngilizce (hybrid convention).
- **Terminoloji kilidi** — proje boyunca sabit kullanılan temel terimler:

| Türkçe | English (kod/tanımlayıcı) | Anlam |
| --- | --- | --- |
| Reel getiri | `real_return` | Nominal getirinin TÜFE ile enflasyondan arındırılmış hali |
| Nominal getiri | `nominal_return` | Fiyat değişiminden hesaplanan, enflasyon etkisi arındırılmamış getiri |
| Varlık sınıfı | `asset_class` | Döviz, altın, kripto, yatırım fonu gibi üst kategori |
| Varlık | `asset` | Karşılaştırılabilir tekil enstrüman (örn. USD/TRY, BTC, belirli bir TEFAS fonu) |
| Normalize edilmiş getiri | `normalized_return` | Grafikte dönem başını 100 kabul eden endeksli getiri serisi |
| Veri tarihi | `as_of_date` | Bir fiyat/veri noktasının ait olduğu gerçek tarih (kaynaklar arası tazelik farkını göstermek için zorunlu alan) |
| Dönem | `period` | Karşılaştırma için seçilen zaman aralığı (1a/3a/1y/3y/5y) |

Bu terimler tüm dokümanlarda ve kod tabanında bu eşleşmeyle kullanılır; farklı bir isimlendirme (örn. `yield` yerine `return`, `instrument` yerine `asset`) tutarsızlık sayılır.

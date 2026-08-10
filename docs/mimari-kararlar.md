# Terazi — Mimari Kararlar Dokümanı

> **Versiyon:** 1.0 (Tamamlandı)
> **Son güncelleme:** 2026-08-04
> **Durum:** 18 bölümün tamamı işlendi (10 çekirdek+opsiyonel karar bölümü, 8 kapsam-dışı işaretli bölüm). 1 düşük öncelikli açık madde kaldı ([I-OPEN-2]). Sıradaki adım: `project-doc-architect`.
> **Amaç:** Bu doküman `docs/` ve `.claude/` altındaki tüm dosyaların referans alacağı tek doğruluk kaynağıdır. Tüm mimari ve iş kuralı kararları buraya işlenir.

---

## İçindekiler

- [1. Proje Kimliği ve Kapsam](#1-proje-kimliği-ve-kapsam)
- [2. Kullanıcı Havuzu ve Ölçek](#2-kullanıcı-havuzu-ve-ölçek)
- [3. Kimlik Doğrulama ve Kullanıcı Yapısı](#3-kimlik-doğrulama-ve-kullanıcı-yapısı)
- [4. Yetkilendirme Mimarisi](#4-yetkilendirme-mimarisi)
- [5. Roller ve Yetki Yönetimi](#5-roller-ve-yetki-yönetimi)
- [6. Süreç (Workflow) Mimarisi](#6-süreç-workflow-mimarisi)
- [7. Görev Yönetimi](#7-görev-yönetimi)
- [8. Doküman Yönetimi](#8-doküman-yönetimi)
- [9. Admin Panelleri](#9-admin-panelleri)
- [10. Güvenlik ve KVKK](#10-güvenlik-ve-kvkk)
- [11. Denetim (Audit Log)](#11-denetim-audit-log)
- [12. Entegrasyonlar](#12-entegrasyonlar)
- [13. Bildirim Sistemi](#13-bildirim-sistemi)
- [14. Tech Stack](#14-tech-stack)
- [15. Altyapı ve Operasyon](#15-altyapı-ve-operasyon)
- [16. Test Stratejisi](#16-test-stratejisi)
- [17. Kod Organizasyonu ve Agent Kuralları](#17-kod-organizasyonu-ve-agent-kuralları)
- [18. Açık Kararlar — Tamamlanması Gerekenler](#18-açık-kararlar--tamamlanması-gerekenler)

---

## Terminoloji Kilidi

Aşağıdaki terimler proje boyunca sabit ve tutarlı kullanılır (TR prosa + EN tanımlayıcı):

| Türkçe | English (kod/tanımlayıcı) | Anlam |
| --- | --- | --- |
| Reel getiri | `real_return` | Nominal getirinin TÜFE ile enflasyondan arındırılmış hali |
| Nominal getiri | `nominal_return` | Fiyat değişiminden hesaplanan, enflasyon etkisi arındırılmamış getiri |
| Varlık sınıfı | `asset_class` | Döviz, altın, kripto, yatırım fonu gibi üst kategori |
| Varlık | `asset` | Karşılaştırılabilir tekil enstrüman (örn. USD/TRY, BTC, belirli bir TEFAS fonu) |
| Normalize edilmiş getiri | `normalized_return` | Grafikte dönem başını 100 kabul eden endeksli getiri serisi |
| Veri tarihi | `as_of_date` | Bir fiyat/veri noktasının ait olduğu gerçek tarih (kaynaklar arası tazelik farkını göstermek için zorunlu alan) |
| Dönem | `period` | Karşılaştırma için seçilen zaman aralığı (1a/3a/1y/3y/5y) |

---

## 1. Proje Kimliği ve Kapsam

**Karar [P-001]:** Terazi, farklı varlık sınıflarının (döviz, altın, kripto, TEFAS yatırım fonları) TL bazında, TÜFE ile enflasyondan arındırılmış reel getirilerini tek bir tabloda karşılaştıran, read-only bir web uygulamasıdır.

**Karar [P-002]:** Ürün modeli single-tenant ve hesapsızdır — v1'de kullanıcı hesabı, oturum veya kişiselleştirme yoktur; tüm ziyaretçiler aynı genel/anonim veriye erişir.

Gerekçe: Ürün bir vitrin/portföy çalışmasıdır, kişisel veri toplamaya gerek yoktur; bu KVKK yüzeyini v1'de minimize eder (bkz. [SEC-NNN] — Bölüm 10'da netleştirilecek). Bu karar Bölüm 3/4/5'in kapsam dışı bırakılmasının doğrudan sebebidir.

**Karar [P-003]:** Platform stratejisi web-only'dir (responsive tasarım); native mobil uygulama v1 kapsamında değildir.

**Karar [P-004]:** Öncelik ilkesi — proje bir vitrin/showcase çalışmasıdır, birincil amaç iş başvuru sürecinde teknik yetkinlik göstermektir. Trafik düşüktür (yüzlerce kullanıcı, ihmal edilebilir eşzamanlılık); bu nedenle ölçeklenebilirlik değil, **veri katmanı kalitesi ve mühendislik pratikleri** (idempotent job'lar, retry/backoff, graceful degradation, hesaplama fonksiyonları için gerçek unit test) UI cilasından önceliklidir.

Çapraz referans: Bu ilke Bölüm 15 (Altyapı) ve Bölüm 16 (Test) kararlarının gerekçesidir; oralarda "neden bu kadar sağlamlık" sorusunun cevabı buraya bağlanır.

**Karar [P-005]:** Dil/yerelleştirme — arayüz dili Türkçe'dir, v1'de çoklu dil (i18n) altyapısı yoktur. Doküman içeriği Türkçe, kod tanımlayıcıları (değişken/fonksiyon/tablo adları vb.) İngilizce yazılır (hybrid convention — bkz. Terminoloji Kilidi tablosu).

**Karar [P-006]:** Yatırım tavsiyesi verilmez ilkesi — SPK mevzuatına göre yatırım danışmanlığı lisansa tabi bir faaliyettir. Ürün hiçbir ekranda "al", "sat", "iyi seçenek", "önerilir" gibi tavsiye niteliğinde ifade veya sıralama-bazlı öneri üretmez; yalnızca geçmiş veriyi gösterir ve karşılaştırır. Her ekranda sabit olarak "geçmiş performans gelecekteki getiriyi göstermez" uyarısı bulunur.

Gerekçe: Bu bir yasal/ürün kısıtıdır, opsiyonel değildir. Uyarının tam yerleşimi (banner/footer) ve varsa metin onayı [AP-NNN] veya doküman-seviyesi screen catalog'da (project-doc-architect çıktısı) netleştirilecektir — bu karar ilkeyi sabitler, UI detayını değil.

**Karar [P-007]:** v1 kapsamı (içeride) —
- Varlık sınıfları: USD/TRY, EUR/TRY, gram altın (kaynak: TCMB EVDS); BTC, ETH ve birkaç majör coin (kaynak: public kripto API); TEFAS yatırım fonları, kategori bazlı filtreyle daraltılmış bir alt küme (bkz. [I-NNN], Bölüm 12).
- Dönem seçici: 1 ay / 3 ay / 1 yıl / 3 yıl / 5 yıl (sabit seçenekler).
- Karşılaştırma tablosu: nominal getiri, reel getiri, dönem başı/sonu fiyat, veri tarihi (`as_of_date`) kolonları; sıralanabilir ve filtrelenebilir.
- Seçilen 2–5 varlığın normalize edilmiş (100 bazlı) getiri grafiği.
- Veri toplama: zamanlanmış job'lar dış kaynaklardan çekip kendi veritabanına yazar; kullanıcı isteği anında dış API'ye gidilmez (bkz. [P-009]).

**Karar [P-008]:** v1 kapsamı (dışarıda, scoped out) — kullanıcı hesabı/auth/yetkilendirme, portföy takibi, BIST hisse senedi verisi (lisans maliyeti nedeniyle bilinçli dışlama), bildirim/alarm/e-posta, gerçek zamanlı fiyat (kripto hariç teknik olarak mümkün değil), herhangi bir al/sat sinyali veya öneri/skor motoru (bkz. [P-006]).

**Karar [P-009]:** Veri toplama modeli ilkesi — sistem "pull-then-serve" mimarisi izler: zamanlanmış job'lar TCMB EVDS, TEFAS ve kripto API'lerinden veri çeker ve kendi veritabanına yazar; kullanıcı tarafındaki okuma istekleri asla doğrudan dış kaynağa gitmez, her zaman kendi veritabanından servis edilir.

Gerekçe: (1) TEFAS kaynağı resmî olmayan, kırılgan bir arka uç endpoint'idir — kullanıcı trafiğini doğrudan bu kaynağa bağlamak tek hata noktası yaratır; (2) üç kaynağın tazelik takvimi farklıdır (bkz. [I-NNN], veri tazeliği kısıtı), veri kendi veritabanında normalize edilip `as_of_date` ile damgalanmadan tutarlı biçimde sunulamaz. Detaylı job/scheduling mimarisi Bölüm 14 (Tech Stack) ve Bölüm 15'te (Altyapı) ele alınacaktır.

---

## 2. Kullanıcı Havuzu ve Ölçek

**Karar [S-001]:** Ölçek varsayımı — toplam kullanıcı sayısı birkaç yüz mertebesindedir, eşzamanlılık ihmal edilebilir düzeydedir. Coğrafya Türkiye ile sınırlıdır, çoklu bölge/ülke desteği v1 kapsamında değildir.

**Karar [S-002]:** Gerçek-zamanlılık — veri, kullanıcı sayfayı her açtığında/yenilediğinde en son veritabanı durumu servis edilerek gösterilir. Sayfa açıkken canlı push/polling (WebSocket dahil) yoktur; bu, kripto verisi için de geçerlidir.

Gerekçe: [P-009] gereği zaten tüm okuma istekleri kendi veritabanından servis ediliyor; kripto dışındaki kaynaklar günlük/T+1 frekansta olduğu için sayfa-içi canlı güncelleme değer katmıyor, gereksiz karmaşıklık eklerdi.

**Karar [S-003]:** Trafik dayanıklılığı — viral/ani trafik artışına özel bir sertleştirme yapılmaz. Standart HTTP cache/CDN katmanı ve makul rate limiting yeterli kabul edilir.

Gerekçe: [P-009] nedeniyle kullanıcı trafiği dış API'lere yük bindirmez (tüm okuma kendi DB'den); bu da viral senaryoyu düşük riskli kılar. Detaylı cache stratejisi Bölüm 14/15'te netleştirilecek.

**Karar [S-004]:** Analytics/izleme — v1'de hiçbir üçüncü parti analytics veya hata izleme (error tracking) aracı kullanılmaz; sayfa ziyaretleri veya hatalar üçüncü taraf servislere gönderilmez.

Gerekçe: [P-002] ile uyumlu olarak KVKK yüzeyini minimumda tutar — çerez bandı, aydınlatma metni gibi ek yükümlülüklere v1'de gerek kalmaz. Bu karar ileride değişirse (ör. Plausible eklenirse) Bölüm 10 (Güvenlik ve KVKK) güncellenmelidir.

---

## 3. Kimlik Doğrulama ve Kullanıcı Yapısı

> ⚪ Bu bölüm proje sahibi talimatıyla kapsam dışı bırakıldı (gerekçe: [P-002] — v1'de kullanıcı hesabı yok, tüm erişim anonim/misafirdir; kimlik doğrulama katmanı bulunmaz).

---

## 4. Yetkilendirme Mimarisi

> ⚪ Bu bölüm proje sahibi talimatıyla kapsam dışı bırakıldı (gerekçe: [P-002] — kullanıcı hesabı olmadığından rol/yetki çözümleme mimarisine ihtiyaç yoktur).

---

## 5. Roller ve Yetki Yönetimi

> ⚪ Bu bölüm proje sahibi talimatıyla kapsam dışı bırakıldı (gerekçe: [P-002] — sistemde tanımlı kullanıcı rolü yoktur).

---

## 6. Süreç (Workflow) Mimarisi

> ⚪ Bu bölüm proje sahibi talimatıyla kapsam dışı bırakıldı (gerekçe: [P-001] — ürün read-only veri sunumudur, state machine/onay süreci içermez).

---

## 7. Görev Yönetimi

> ⚪ Bu bölüm proje sahibi talimatıyla kapsam dışı bırakıldı (gerekçe: kullanıcıya atanan görev kavramı yoktur; veri toplama job'ları operasyonel bir konudur, bkz. Bölüm 15).

---

## 8. Doküman Yönetimi

> ⚪ Bu bölüm proje sahibi talimatıyla kapsam dışı bırakıldı (gerekçe: kullanıcı dosya yükleme/saklama özelliği yoktur).

---

## 9. Admin Panelleri

**Karar [AP-001]:** v1 kapsamına minimal bir operatör paneli dahildir — veri toplama job'larının durumunu (son çalışma zamanı, başarı/hata), her veri kaynağının sağlığını (TCMB/TEFAS/kripto için son başarılı güncelleme zamanı) gösteren bir iç ekran.

Gerekçe: [P-004] ilkesi gereği veri katmanının gözlemlenebilirliği önemlidir; kullanıcı auth'u olmadığı için ([P-002]) bu ekranın korunması ayrıca ele alınmıştır (bkz. [AP-002]).

**Karar [AP-002]:** Operatör paneli, tek kullanıcılı HTTP Basic Auth ile korunur; kullanıcı adı/şifre ortam değişkenlerinde (env var) tutulur.

Gerekçe: Basit, tersinir ve kod olarak minimaldir; portföy projesi bağlamında dahi temel bir güvenlik farkındalığı gösterir. Route gizliliği (obscurity) veya IP kısıtı gibi alternatiflere göre hosting ortamından bağımsızdır. Detaylı env var isimlendirmesi [SEC-NNN]/[INF-NNN]'de netleştirilir.

---

## 10. Güvenlik ve KVKK

**Karar [SEC-001]:** Hedef güvenlik seviyesi — pragmatik/temel güvenlik: OWASP Top 10 temel önlemleri (input validation, secrets yönetimi, HTTP güvenlik başlıkları, dependency taraması) uygulanır. Ağır uyum çerçeveleri (OWASP ASVS L2+, ISO 27001) hedeflenmez.

Gerekçe: Sistemde kullanıcı hesabı/PII yok ([P-002], [S-004]), ölçek küçük ([S-001]); ağır uyum yükü bu risk profiliyle orantısız olurdu.

**Karar [SEC-002]:** Veri sınıflandırması iki basit sınıfla sınırlıdır: **Gizli** (dış API key'leri, operatör paneli credential'ı) ve **Public** (piyasa/fiyat verisi, herkese açık). KVKK'ya konu bir kişisel veri sınıfı yoktur çünkü v1'de kişisel veri toplanmaz ([P-002], [S-004]).

**Karar [SEC-003]:** Secrets yönetimi — dış API key'leri ve operatör paneli credential'ı ([AP-002]) ortam değişkenlerinde tutulur; kod tabanına girmez. `.env.example` ile dokümante edilir, gerçek değerler deployment platformunun secret store'u üzerinden enjekte edilir (bkz. Bölüm 15).

Gerekçe: Tek geliştirici / vitrin ölçeğinde ayrı bir secret manager servisi (Vault vb.) orantısız karmaşıklık ekler.

**Karar [SEC-004]:** HTTP güvenlik başlıkları — seçilecek framework'ün (bkz. Bölüm 14) güvenlik middleware'i ve hosting platformunun edge katmanı kullanılır; temel bir CSP tanımlanır; CORS yalnızca kendi frontend origin'ine izin verir.

**Karar [SEC-005]:** Rate limiting — basit IP-bazlı rate limiting uygulanır (örn. dakikada N istek). Bu, [S-003]'teki "ekstra sertleştirme yok" kararıyla uyumlu, minimal bir korumadır.

**Karar [SEC-006]:** Input validation — kullanıcıdan gelen tüm query parametreleri (varlık ID'leri, dönem enum'u, sıralama alanı) şema bazlı whitelist doğrulamadan geçer; tanınmayan/geçersiz değerler HTTP 400 döner. SQL injection riski ORM/parametrik sorgu kullanımıyla ayrıca kapatılır (bkz. Bölüm 14, ORM kararı).

**Karar [SEC-007]:** Dış kaynaklardan (TCMB EVDS, TEFAS, kripto API) gelen yanıtlar da kendi şemamıza karşı doğrulanır (tip/aralık kontrolü). Beklenmeyen format job'u sessizce bozmaz; hata olarak işaretlenip loglanır.

Gerekçe: TEFAS kaynağı resmî olmayan, kırılgan bir arka uç endpoint'idir (bkz. [P-009] gerekçesi) — format değişikliği veya beklenmeyen içerik riski diğer iki kaynaktan yüksektir. Bu karar Bölüm 15'teki job resilience kararlarıyla (idempotency, retry/backoff, graceful degradation) birlikte çalışır; biri veriyi doğrular, diğeri hatayı yönetir.

**Karar [SEC-008]:** Dependency/vulnerability taraması CI'da otomatik çalışır (örn. Dependabot + `npm audit` veya stack'e uygun eşdeğeri); kritik/yüksek zafiyetlerde build uyarır. Detaylı CI entegrasyonu Bölüm 16'da netleştirilir.

**Karar [SEC-009]:** Operatör paneli erişim güvenliği [AP-002] ile birebir aynıdır: HTTP Basic Auth, credential env var'da tutulur (bkz. [SEC-003]).

**Karar [SEC-010]:** KVKK kapsamı — v1'de kişisel veri işlenmediği için ([P-002], [S-004]) veri sahibi hakları, aydınlatma metni, açık rıza akışı gibi KVKK yükümlülükleri v1'de uygulanmaz. Bu durum yalnızca kullanıcı hesabı, analytics veya benzeri bir kişisel veri toplama özelliği eklenirse yeniden değerlendirilir — o zamana kadar bu bölüm "kapsam dışı, çünkü konu yok" statüsündedir.

---

## 11. Denetim (Audit Log)

> ⚪ Bu bölüm proje sahibi talimatıyla kapsam dışı bırakıldı (gerekçe: [P-002] — kullanıcı hesabı/eylemi olmadığından klasik "kim-ne-yaptı" audit log'una konu yoktur. Veri toplama job'larının çalışma geçmişi — run history, kaynak bazlı başarı/hata, idempotency kaydı — operasyonel bir monitoring konusu olarak Bölüm 15 (Altyapı ve Operasyon) altında ele alınır).

---

## 12. Entegrasyonlar

**Karar [I-001]:** Üç harici veri kaynağı entegre edilir: TCMB EVDS (döviz kurları, gram altın, TÜFE), TEFAS (yatırım fonu fiyatları, resmî olmayan arka uç endpoint), CoinGecko (kripto para fiyatları). Tümü [P-009]'daki "pull-then-serve" modeline göre zamanlanmış job'larla çekilip kendi veritabanına yazılır; kullanıcı isteği hiçbir zaman doğrudan bu kaynaklara gitmez.

**Karar [I-002]:** TCMB EVDS entegrasyonu — kişisel EVDS hesabıyla alınan ücretsiz API key kullanılır (env var'da saklanır, bkz. [SEC-003]); veri günde 1 kez, iş günü sonrası çekilir (TCMB'nin kendi güncelleme takvimiyle uyumlu). Kapsam: USD/TRY, EUR/TRY, gram altın, TÜFE endeksi.

**Karar [I-003]:** TEFAS entegrasyonu — v1 kapsamı 4 şemsiye fon kategorisiyle sınırlıdır: Hisse Senedi Şemsiye Fonu, Borçlanma Araçları Şemsiye Fonu, Altın/Kıymetli Madenler Şemsiye Fonu, Karışık/Değişken Şemsiye Fonu. Veri günde 1 kez, iş günü sonrası çekilir.

Gerekçe: TEFAS verisi T+1 güncellendiği için günde birden fazla çekim ek değer katmaz, yalnızca resmî olmayan kaynağa gereksiz yük bindirir ve ban/kırılma riskini artırır. Bu kaynağın kırılganlığı nedeniyle ayrıca [SEC-007] (gelen veri doğrulaması) ve Bölüm 15'teki resilience kararları (idempotency, retry/backoff, graceful degradation) bu entegrasyona sıkı sıkıya bağlıdır — TEFAS job'u başarısız olduğunda sistemin geri kalanı çalışmaya devam etmelidir.

**Karar [I-004]:** Kripto entegrasyonu — kaynak CoinGecko (TL karşılığı fiyat doğrudan desteklenir, ücretsiz katmanda geniş tarihsel veri erişimi vardır). Kapsam: BTC, ETH ve birkaç majör coin (tam liste [I-OPEN-2] — Bölüm 18'de açık). Veri günde birkaç kez çekilir.

Gerekçe: Kripto piyasası 7/24 hareketli olduğu için günde tek çekim diğer iki kaynağa göre daha az temsil edici olur; [S-002] kararı gereği bu yine de sayfa-içi canlı güncelleme anlamına gelmez, sadece job sıklığı diğerlerinden farklıdır. Tam çekim saatleri/aralığı Bölüm 15'te (job scheduling) netleştirilir.

**Karar [I-005]:** Senkronizasyon modeli — her kaynak için job'lar idempotenttir: aynı gün için tekrar çalıştırıldığında veri kopyalanmaz, mevcut kayıt üzerine güvenli şekilde upsert edilir. Her kayıt `as_of_date` ile damgalanır (bkz. Terminoloji Kilidi). Detaylı job mimarisi (scheduler, retry/backoff, hata bildirimi) Bölüm 15'te ele alınır.

---

## 13. Bildirim Sistemi

> ⚪ Bu bölüm proje sahibi talimatıyla kapsam dışı bırakıldı (gerekçe: [P-008] — v1'de bildirim/alarm/e-posta yoktur).

---

## 14. Tech Stack

**Karar [TS-001]:** Dil uçtan uca TypeScript'tir (frontend, backend, worker, paylaşılan kod).

Gerekçe: Tek dil ile tip güvenliği, paylaşılan `core` paketi (hesaplama fonksiyonları, Prisma client) üzerinden web ve worker arasında kod/tip paylaşımı; TR iş piyasasında en yaygın aranan yetkinliklerden biri ([P-004] — vitrin amacı).

**Karar [TS-002]:** Frontend Next.js (App Router) + Tailwind CSS + shadcn/ui ile kurulur.

Gerekçe: Modern React pratiklerini gösterir, ücretsiz Vercel deploy'a uygundur, shadcn/ui hızlı ve tutarlı bir arayüz sağlar. Alternatifi (Remix, plain Vite+React) değerlendirildi; Next.js'in ekosistem olgunluğu ve iş ilanlarındaki yaygınlığı tercih sebebidir.

**Karar [TS-003]:** API stili düz REST'tir; Next.js API routes üzerinden servis edilir. tRPC gibi tip-paylaşımlı alternatifler değerlendirildi ancak tek tüketicili (yalnızca kendi frontend'i) bir projede fayda/karmaşıklık oranı REST kadar net olmadığından reddedildi.

**Karar [TS-004]:** Veri toplama job'ları ayrı, bağımsız bir Node.js worker process olarak çalışır; harici bir platformun (bkz. Bölüm 15) zamanlanmış görev (cron) mekanizmasıyla tetiklenir.

Gerekçe: Next.js serverless fonksiyonlarının süre sınırı, üç farklı kaynağın (özellikle kırılgan TEFAS, [SEC-007]) retry/backoff mantığını güvenle barındırmaya yetmeyebilir; ayrı worker bu riski ortadan kaldırır ve [P-004]'teki "veri katmanı kalitesi önceliklidir" ilkesiyle uyumludur.

**Karar [TS-005]:** Monorepo pnpm workspaces ile kurulur: `apps/web` (Next.js), `apps/worker` (veri toplama job'ları), `packages/core` (paylaşılan Prisma client, hesaplama fonksiyonları, Zod şemaları).

Gerekçe: Web ve worker arasında hesaplama/şema kodu paylaşımı gerekiyor ([I-005], [SEC-006]); bu ölçekte (2 uygulama + 1 paylaşılan paket) Turborepo gibi ek bir orkestrasyon katmanı gereksiz karmaşıklık ekler.

**Karar [TS-006]:** Veritabanı PostgreSQL, ORM Prisma'dır. Parasal/fiyat alanları `DECIMAL`/`NUMERIC` tipinde tutulur, uygulama kodunda float kullanılmaz (bkz. Kısıt #4 — reel getiri hesabı çekirdek işlevdir).

Gerekçe: Prisma + Postgres kombinasyonu TypeScript ekosisteminde olgun ve yaygın; zaman serisi sorguları (dönem bazlı fiyat aralığı) için Postgres yeterlidir, ayrı bir time-series DB (TimescaleDB vb.) bu ölçekte gerekli değildir.

**Karar [TS-007]:** Girdi doğrulama Zod ile yapılır — hem API route'larındaki query parametreleri ([SEC-006]) hem de dış kaynaklardan gelen yanıtların şema doğrulaması ([SEC-007]) için aynı kütüphane kullanılır.

**Karar [TS-008]:** Grafik kütüphanesi Recharts (normalize edilmiş getiri çizgi grafiği), tablo etkileşimi (sıralama/filtreleme) TanStack Table (headless, UI shadcn/ui ile kontrol edilir).

**Karar [TS-009]:** Versiyon pinleri (ACTION-FIRST varsayılan) — Node.js 22 LTS, Next.js son stabil (App Router), React 19, PostgreSQL 16+, Prisma 5+, pnpm son stabil. Tam pin listesi `.claude/rules/00-project-identity.md`'de (rules-architect çıktısı) `package.json` ile senkron tutulur.

---

## 15. Altyapı ve Operasyon

**Karar [INF-001]:** Hosting — Next.js web uygulaması Vercel'de, worker process ve PostgreSQL veritabanı Railway'de barındırılır.

Gerekçe: Vercel Next.js'e özel optimizasyonlardan (edge cache, preview deployment) yararlanır ([TS-002]); Railway kalıcı process/cron ve Postgres barındırma için uygundur ([TS-004], [TS-006]). Her platform kendi güçlü yönünde kullanılır, ücretsiz/düşük maliyetli katmanlar bu ölçeğe ([S-001]) yeterlidir.

**Karar [INF-002]:** CI/CD — GitHub Actions push/PR üzerinde lint + test + build çalıştırır ([TEST-NNN]'e bağlı, Bölüm 16). Main'e merge sonrası Vercel/Railway'in kendi otomatik deploy mekanizması tetiklenir; ayrı bir deploy pipeline'ı kurulmaz.

**Karar [INF-003]:** Monitoring/logging — worker'ın her çalışması kendi veritabanındaki `job_run` tablosuna yazılır (alanlar: kaynak [`tcmb`/`tefas`/`coingecko`], başlangıç/bitiş zamanı, durum [başarı/hata], hata mesajı). Bu tablo operatör paneli ([AP-001]) tarafından gösterilir. Platformların kendi log akışı (Railway/Vercel logs) yedek/tamamlayıcı olarak kullanılır. Harici bir APM/error-tracking servisi (Sentry, Datadog vb.) eklenmez.

Gerekçe: [SEC-010]'daki "analytics/hata izleme yok" kararı kullanıcı tarafı içindi; burada worker/backend gözlemlenebilirliği ayrı ele alınıp DB-içi bir çözümle karşılanıyor — [P-004]'teki "veri katmanı kalitesi" ilkesiyle uyumlu, ek üçüncü-parti bağımlılığı eklemiyor. Bu karar aynı zamanda Bölüm 11'in (kapsam dışı) yönlendirdiği "job run history" ihtiyacını karşılar.

**Karar [INF-004]:** Backup — Railway Postgres'in yerleşik otomatik backup'ı kullanılır; ayrı bir PITR/DR stratejisi kurulmaz.

Gerekçe: TCMB EVDS ve CoinGecko geçmiş veri sorgulamaya izin verdiği için veri kaybı büyük ölçüde yeniden çekilerek telafi edilebilir; TEFAS için bu garanti yoktur (yalnızca güncel veri sunar) ancak bu riski platform backup'ı karşılamaya yeter — proje ölçeği ([S-001]) ağır bir DR yatırımını gerektirmiyor.

**Karar [INF-005]:** Environment izolasyonu üç ortamla yapılır: **local** (Docker Compose ile lokal Postgres), **staging** (Vercel/Railway preview ortamları, PR bazlı), **production**. Staging, production'a merge öncesi doğrulama katmanı olarak kullanılır.

**Karar [INF-006]:** Cache stratejisi — API route yanıtlarına HTTP `Cache-Control` başlıkları eklenir (job çalışma sıklığıyla uyumlu bir `max-age`); ayrı bir Redis/in-memory cache katmanı v1'de kurulmaz.

Gerekçe: Veri günde 1–birkaç kez güncellendiği için ([I-002], [I-003], [I-004]) HTTP-seviyesi cache yeterlidir; [S-003]'teki "ekstra sertleştirme yok" kararıyla uyumludur.

---

## 16. Test Stratejisi

**Karar [TEST-001]:** Test piramidi üç katmanlıdır: (1) `packages/core`'daki hesaplama fonksiyonları (reel getiri, TÜFE arındırma, normalize edilmiş getiri) için ağırlıklı unit test; (2) API route'ları ve worker job'ları için, test DB'sine karşı çalışan integration test; (3) UI için kapsamlı e2e yerine birkaç kritik akış (tablo yükleme, varlık seçimi, grafik render) için smoke test.

Gerekçe: [P-004] ilkesi gereği ("veri katmanı kalitesi UI'dan önemli") test yatırımı hesaplama çekirdeğine yoğunlaşır; bu Kısıt #4 ile (reel getiri hesabının ürünün çekirdeği olması, float kullanılmaması) doğrudan bağlantılıdır.

**Karar [TEST-002]:** Coverage hedefleri sayısal olarak sabittir:

| Katman | Hedef |
| --- | --- |
| `packages/core` (hesaplama fonksiyonları) | %90+ |
| `apps/web`, `apps/worker` (routing, entegrasyon, UI) | %60+ |

**Karar [TEST-003]:** Seed/test verisi stratejisi — testler ve lokal geliştirme, TCMB EVDS / TEFAS / CoinGecko yanıtlarının sabit fixture JSON'larıyla çalışır. Gerçek dış API'lere test sırasında gidilmez.

Gerekçe: TEFAS kaynağının kırılganlığı ([SEC-007], [I-003]) test kararlılığını tehlikeye atar; fixture'lar hem hız hem determinizm sağlar. Fixture'lar ayrıca dış kaynak şeması değiştiğinde [SEC-007]'deki doğrulama katmanının doğru çalıştığını kanıtlamak için "bozuk veri" senaryolarını da içerir (örn. eksik alan, beklenmeyen tip).

**Karar [TEST-004]:** Test/build araçları (ACTION-FIRST): Vitest (unit + integration test runner, Next.js/TS ile hızlı entegrasyon), Playwright (smoke e2e). İtiraz edilirse değiştirilir.

**Karar [TEST-005]:** Agent kullanıcı onayı olmadan main'e merge etmez. CI (lint + test + build, [INF-002]) yeşil olsa dahi, main'e merge işlemi proje sahibinin açık onayını gerektirir.

---

## 17. Kod Organizasyonu ve Agent Kuralları

**Karar [CODE-001]:** Agent'ın yapmaması gerekenler (onaylandı):

1. Parasal/fiyat hesaplamalarında `float`/`Number` kullanmak — her yerde `DECIMAL`/`NUMERIC` ve string-safe hesaplama kullanılır ([TS-006], Kısıt #4).
2. Herhangi bir ekranda "al", "sat", "iyi seçenek", "önerilir" gibi tavsiye dili veya sıralama-bazlı öneri üretmek ([P-006]).
3. Frontend'den (client-side) doğrudan TCMB EVDS / TEFAS / CoinGecko'ya istek atmak — tüm okuma kendi API/DB'sinden servis edilir ([P-009], [I-001]).
4. Dış kaynaktan gelen veriyi şema doğrulamasından ([SEC-007]) geçirmeden veritabanına yazmak.
5. `packages/core` altındaki hesaplama fonksiyonlarını test kapsamı %90 altına düşürecek şekilde değiştirmek ([TEST-002]).
6. Secrets'ı (API key, operatör paneli şifresi) kod tabanına, log'a veya commit mesajına yazmak ([SEC-003]).
7. Kullanıcı hesabı/auth/kişiselleştirme özelliği eklemek — bu v1 kapsamı dışıdır ([P-008]); eklenmek istenirse önce bu doküman güncellenir.
8. Proje sahibi onayı olmadan `main`'e merge etmek ([TEST-005]).

**Karar [CODE-002]:** Klasör yapısı (ACTION-FIRST) —

```
apps/
  web/        # Next.js (App Router)
  worker/     # veri toplama job'ları
packages/
  core/       # hesaplama fonksiyonları, Zod şemaları, Prisma client
  db/         # Prisma schema + migration'lar (core içinde de tutulabilir; itiraz edilirse ayrılır)
```

**Karar [CODE-003]:** Naming conventions (ACTION-FIRST) — Klasör/dosya `kebab-case`, Component/Type `PascalCase`, fonksiyon/değişken `camelCase`, constant/enum `UPPER_SNAKE_CASE`, DB tablo/kolon `snake_case` (tablo adları çoğul, örn. `asset_prices`).

**Karar [CODE-004]:** Commit standardı Conventional Commits'tir (`feat:`, `fix:`, `chore:`, `test:`, `refactor:` vb.), İngilizce yazılır.

**Karar [CODE-005]:** Her-feature kontrol listesi (ACTION-FIRST) — bir değişiklik "tamamlandı" sayılmadan önce: (1) ilgili unit/integration testler yazıldı ve geçiyor, (2) [TEST-002] coverage eşikleri korundu, (3) [CODE-001]'deki yasak listesine aykırılık yok, (4) yeni bir mimari karar gerektiren bir seçim yapılmadıysa veya yapıldıysa önce bu doküman güncellendi, (5) CI ([INF-002]) yeşil.

---

## 18. Açık Kararlar — Tamamlanması Gerekenler

Aşağıdaki kararlar henüz alınmamıştır. **Bu kararlar tamamlanmadan ilgili kod parçalarının geliştirilmesine başlanmamalıdır.**

- 🟢 **[I-OPEN-2]** Kripto kapsamındaki "birkaç majör coin"in tam listesi (BTC, ETH dışında) netleşmedi — MVP öncesi netleştirilmeli.

<!-- Diğer [KATEGORI-OPEN-N] maddeleri ilgili bölümler işlendikçe eklenecek -->

---

## Versiyon Geçmişi

| Versiyon | Tarih      | Açıklama      |
| -------- | ---------- | ------------- |
| 0.1      | 2026-08-04 | İlk taslak.   |
| 0.2      | 2026-08-04 | Section 1 (Proje Kimliği ve Kapsam) kapandı: [P-001]–[P-009]. Section 9 kısmen açıldı: [AP-001], açık madde [AP-OPEN-1]. Section 3, 4, 5, 6, 7, 8, 13 kapsam dışı işaretlendi ([P-002], [P-001], [P-008] gerekçeleriyle). Section 11 kapsam dışı işaretlendi, job run history Section 15'e yönlendirildi. Terminoloji kilidi tablosu eklendi. Açık madde: [I-OPEN-1] (TEFAS kategori seçimi). |
| 1.0      | 2026-08-04 | Doküman tamamlandı. Section 2: [S-001]–[S-004]. Section 9: [AP-002] eklendi, [AP-OPEN-1] kapandı. Section 10: [SEC-001]–[SEC-010]. Section 12: [I-001]–[I-005], [I-OPEN-1] kapandı, yeni açık madde [I-OPEN-2] (kripto coin listesi, 🟢 düşük öncelik). Section 14: [TS-001]–[TS-009]. Section 15: [INF-001]–[INF-006]. Section 16: [TEST-001]–[TEST-005]. Section 17: [CODE-001]–[CODE-005]. Cross-reference taraması yapıldı, tüm ID'ler tutarlı. Kalan tek açık madde: [I-OPEN-2]. |

---

## Nasıl Kullanılır?

Bu doküman **canlı bir dokümandır** — kararlar netleştikçe güncellenecektir. Her yeni karar için:

1. İlgili bölüme karar eklenir (Karar ID formatı: `[KATEGORI-SIRA]`).
2. Karar açıksa Bölüm 18'e `[KATEGORI-OPEN-N]` olarak öncelik etiketiyle yazılır; kapandığında listeden silinir.
3. Versiyon geçmişine not düşülür.

`docs/` dokümanları ve `.claude/rules/` kuralları oluşturulurken bu dokümandaki karar ID'leri **referans** olarak kullanılır. Böylece hiçbir kural boşlukta kalmaz, her kural bir mimari karara bağlıdır.

Pipeline: bu doküman → `project-doc-architect` (11 doküman) → `rules-architect` (`.claude/rules/` + `CLAUDE.md`) → `phase-creator` (faz skill'leri) → `phase-controller` (audit).

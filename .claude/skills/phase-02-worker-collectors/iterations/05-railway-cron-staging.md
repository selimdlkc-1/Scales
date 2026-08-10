### İterasyon 5 — Railway Cron Konfigürasyonu ve Staging Doğrulaması (§2.5)

**Hedef:** Üç job'un zamanlaması (`docs/04_BACKEND_SPEC.md §8` saatleri) Railway'de kurulu; staging ortamında gerçek bir çalıştırmanın doğrulanması (fixture değil, gerçek dış API — **yalnızca bu iterasyonda**, tek seferlik manuel doğrulama amaçlı).

**Teslim çıktısı:**
- Railway cron konfigürasyonu (3 zamanlanmış job)
- Staging'de en az 1 gerçek çalıştırma kaydı (`job_runs` tablosunda `success`/`partial`)

**Önkoşullar:**
- [ ] İterasyon 4 Stop tamam (üç job ortak helper üzerinden çalışıyor, tüm testler yeşil)
- [ ] Staging ortamı ayakta (Railway, `docs/09_DEV_WORKFLOW.md §5`)
- [ ] `chore/railway-cron-staging` branch'i açıldı
- [ ] **Proje sahibi onayı:** kullanılacak `TCMB_EVDS_API_KEY`/`COINGECKO_API_KEY`'in staging'e özel ve quota'sının uygun olduğu teyit edilmiş (`docs/10_IMPLEMENTATION_ROADMAP.md §4` human gate tablosu — bu iterasyondan **önce** alınır)

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §2.5 — iterasyon kapsamı
2. `docs/10_IMPLEMENTATION_ROADMAP.md` §4 — human gate tablosu, "Faz 2 §2.5 gerçek API doğrulaması" satırı
3. `docs/04_BACKEND_SPEC.md` §8 — zamanlama saatleri (TCMB/TEFAS: iş günü 18:30 Europe/Istanbul; CoinGecko: 4 saatte bir)
4. `docs/09_DEV_WORKFLOW.md` §5, §7 — staging ortamı ve secret temin şekli

**Uygulama planı:**
1. Railway'de 3 ayrı zamanlanmış görev (veya tek servis + 3 cron tetikleyici) tanımla: TCMB + TEFAS → her iş günü 18:30 Europe/Istanbul; CoinGecko → her 4 saatte bir (00/04/08/12/16/20 Europe/Istanbul).
2. Staging ortam değişkenlerinin (staging'e özel `TCMB_EVDS_API_KEY`/`COINGECKO_API_KEY`, `docs/09` §7) Railway proje ayarlarında tanımlı olduğunu doğrula.
3. **Proje sahibi onayını bekle** — bu iterasyon başlamadan önceki adımdır (Önkoşullar); onay yoksa gerçek çağrı yapılmaz, iterasyon burada durur.
4. Onay sonrası her 3 job'u staging'de bir kez manuel tetikle (`entrypoints/run-*.ts` staging ortamında).
5. `job_runs` tablosunda staging'de gerçek `success`/`partial` kaydının oluştuğunu doğrula (fixture değil).

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | Railway cron config (platform ayarı veya `railway.json`/`railway.toml` — repo içinde ifade ediliyorsa) |
| Güncelle | — |
| Dokunma | Production seed/deploy (Faz 5 §5.6) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| TCMB/TEFAS 18:30 Europe/Istanbul, iş günü | `docs/04_BACKEND_SPEC.md` §8 | Railway cron schedule |
| CoinGecko 4 saatte bir | `docs/04_BACKEND_SPEC.md` §8 | Railway cron schedule (6 tetikleme/gün) |
| Staging gerçek API doğrulaması yalnızca bu iterasyonda | `docs/10_IMPLEMENTATION_ROADMAP.md` §2.5, §4 human gate | Proje sahibi onayı + tek seferlik manuel tetikleme, sonrasında yalnızca cron |

**Kalite kapıları:**
- [ ] 3 cron schedule Railway'de tanımlı ve doğrulanmış
- [ ] Staging'de en az 1 gerçek çalıştırma `job_runs`'a `success`/`partial` olarak yazılmış
- [ ] Proje sahibi API key/quota onayı alınmış olduğu kayıt altında (PR açıklamasında belirtilir)

**Bu iterasyonda yok:** Production deploy/seed (Faz 5 §5.6), yeni job/kaynak, admin panelinden bu verinin gösterimi (Faz 5 §5.2).

**Risk / dikkat:** Bu iterasyon roadmap'in insan onayı gerektirdiği noktalarından biridir (`docs/10` §4 tablosu) — agent kullanılan API key'lerin/quota'ların proje sahibi tarafından teyit edilmeden staging'de gerçek dış API çağrısı **yapmaz**. TCMB EVDS günlük 1 çekim + CoinGecko 5 coin ile sınırlı istek hacmi olsa da (`docs/10` §5 risk kaydı) manuel tetikleme sırasında yanlışlıkla tekrar tekrar çalıştırmaktan kaçınılmalı.

**Stop:**
- [ ] Railway cron config'leri doğrulanmış
- [ ] **Human gate:** proje sahibi API key/quota onayı alınmış (kayıt altında)
- [ ] Staging'de gerçek çalıştırma `job_runs`'ta görünüyor
- [ ] Faz 2 Done Definition kontrolü; `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 2 işareti
- [ ] PR/onay → Faz 3 (İterasyon 1)

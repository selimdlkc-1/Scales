# Railway Cron Konfigürasyonu — `apps/worker`

`docs/04_BACKEND_SPEC.md §8` ve `docs/10_IMPLEMENTATION_ROADMAP.md §2.5` kapsamındaki üç job için
Railway config-as-code dosyaları. `apps/worker` sürekli çalışan bir daemon değildir; her dosya ayrı
bir Railway **service**'e karşılık gelir ve o service'i Railway'in cron mekanizmasıyla tetikler
([TS-004]).

## Service kurulumu (Railway dashboard, tek seferlik)

Aynı repo/branch'ten üç ayrı service oluşturulur, her biri aşağıdaki config path'ine işaret eder
(Settings → Config-as-code Path):

| Service | Config path | Zamanlama (Europe/Istanbul) | Cron (UTC) |
| --- | --- | --- | --- |
| `terazi-worker-tcmb` | `railway/tcmb.json` | İş günü 18:30 | `30 15 * * 1-5` |
| `terazi-worker-tefas` | `railway/tefas.json` | İş günü 18:30 | `30 15 * * 1-5` |
| `terazi-worker-coingecko` | `railway/coingecko.json` | Her 4 saatte bir (00/04/08/12/16/20) | `0 1,5,9,13,17,21 * * *` |

İstanbul yaz saati uygulamıyor (sabit UTC+3), bu yüzden cron ifadeleri DST'ye göre ayrıca
ayarlanmaz.

Her üç service için:

- **Root directory:** repo kökü (pnpm workspace komutları kökten çalışır).
- **Restart policy:** `NEVER` — job bir kez çalışır, başarısız da olsa kendini yeniden
  zamanlamaz (`.claude/rules/15-worker-jobs.md`); bir sonraki tetikleme bir sonraki cron
  zamanlamasını bekler.

## Ortam değişkenleri (service başına, `docs/04_BACKEND_SPEC.md §10`)

| Değişken | tcmb | tefas | coingecko |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✓ | ✓ | ✓ |
| `TCMB_EVDS_API_KEY` | ✓ | — | — |
| `COINGECKO_API_KEY` | — | — | ✓ (opsiyonel, ücretsiz katmanda zorunlu değil) |
| `NODE_ENV=staging` / `production` | ✓ | ✓ | ✓ |
| `LOG_LEVEL=info` | ✓ | ✓ | ✓ |

Staging ortamı için kullanılan `TCMB_EVDS_API_KEY`/`COINGECKO_API_KEY` **production'dan ayrı,
staging'e özel** olmalı (`docs/09_DEV_WORKFLOW.md §7`). Secret'lar yalnızca Railway proje
ayarlarında tanımlanır; repo'da veya CI log'unda görünmez ([SEC-003]).

## Kapsam dışı

Bu dosyalar staging/production'a otomatik deploy tetiklemez — Railway'in "yeni service oluştur ve
bu config path'ini seç" adımı proje sahibi tarafından dashboard üzerinden tek seferlik yapılır.
Production seed/deploy checklist'i Faz 5 §5.6 kapsamındadır, burada yok.

# 09. Geliştirme İş Akışı — Terazi

## 1. Branch Stratejisi ve Adlandırma

- **`main`**: her zaman deploy edilebilir durumda tutulur; doğrudan commit yapılmaz.
- **Feature branch'ler**: `main`'den dallanır, adlandırma `<tip>/<kısa-açıklama>` deseninde — tip, commit standardıyla (§2) aynı sözlüğü kullanır: `feat/comparison-table`, `fix/tefas-parser-null-check`, `chore/upgrade-prisma`.
- Faz bazlı çalışma disiplini (bkz. `10_IMPLEMENTATION_ROADMAP.md`) her iterasyon için ayrı bir branch açılmasını önerir; bir branch birden fazla faz alt maddesini karıştırmaz.

## 2. Commit Standardı

Conventional Commits, İngilizce yazılır ([CODE-004]):

| Tip | Kullanım |
| --- | --- |
| `feat:` | Yeni özellik/endpoint/ekran |
| `fix:` | Hata düzeltmesi |
| `chore:` | Bağımlılık güncelleme, konfigürasyon değişikliği |
| `test:` | Yalnızca test ekleme/düzenleme |
| `refactor:` | Davranış değişmeden kod yeniden düzenleme |
| `docs:` | `docs/` içeriği güncelleme |

Örnek: `feat(worker): add TEFAS job retry with exponential backoff`

## 3. PR Süreci ve Zorunlu Kontroller

Her PR açılmadan önce ve merge öncesi aşağıdakiler doğrulanır ([CODE-005]):

1. İlgili unit/integration testler yazıldı ve geçiyor.
2. `08_TESTING_STRATEGY.md §2`'deki coverage eşikleri korundu.
3. `07_SECURITY_IMPLEMENTATION.md`'deki yasak listesine (float kullanımı, tavsiye dili, doğrudan dış API çağrısı vb.) aykırılık yok.
4. Yeni bir mimari karar gerektiren bir seçim yapılmadıysa veya yapıldıysa önce `docs/` güncellendi.
5. CI (`lint` + `test` + `build`, [INF-002]) yeşil.

PR açıklaması, hangi Faz/§N.M alt maddesine karşılık geldiğini belirtir (bkz. `10_IMPLEMENTATION_ROADMAP.md §3`).

## 4. Agent Kuralları — Onaysız Merge Yasağı

**Agent, kullanıcı onayı olmadan `main`'e merge etmez** ([TEST-005]). CI yeşil olsa dahi bu, merge için yeterli koşul değildir — proje sahibinin açık onayı ayrıca gereklidir. Agent:

- PR'ı açar, CI'ın yeşil olduğunu doğrular, sonucu proje sahibine bildirir.
- Proje sahibi açıkça "merge et" demeden PR'ı `main`'e birleştirmez.
- `--no-verify` ile hook atlamaz, `git push --force` ile `main`'in geçmişini değiştirmez.

## 5. Ortamlar ve İzolasyon

| Ortam | Amaç | Altyapı |
| --- | --- | --- |
| **local** | Geliştirme | Docker Compose ile lokal PostgreSQL; `apps/web` ve `apps/worker` doğrudan `pnpm dev` ile çalışır |
| **staging** | `main`'e merge öncesi doğrulama | Vercel/Railway preview ortamları, PR bazlı otomatik oluşturulur |
| **production** | Canlı | Vercel (web) + Railway (worker + Postgres) |

Staging, production'a merge öncesi son doğrulama katmanıdır ([INF-005]) — bir PR'ın staging'de görünür bir soruna yol açmadığı doğrulanmadan production'a alınmaz.

## 6. Local Kurulum Adımları

1. `pnpm install` — monorepo bağımlılıklarını kurar (pnpm workspaces, [TS-005]).
2. `docker compose up -d` — lokal PostgreSQL'i ayağa kaldırır.
3. `.env.example` dosyasını `.env`'e kopyala, gerekli değerleri doldur (bkz. §7).
4. `pnpm --filter core prisma migrate dev` — şemayı lokal veritabanına uygular.
5. `pnpm --filter core prisma db seed` — `asset_classes`/`assets` referans verisini yükler.
6. `pnpm --filter web dev` — Next.js dev server'ı başlatır (`localhost:3000`).
7. Worker job'larını lokalde tek seferlik çalıştırmak için: `pnpm --filter worker run:tcmb` (veya `run:tefas`, `run:coingecko`) — local'de bunlar cron ile değil, elle tetiklenir.

## 7. Env Değişkenleri ve Secret Temini

Tam liste `04_BACKEND_SPEC.md §10`'da. Temin şekli ortama göre değişir:

| Ortam | Temin şekli |
| --- | --- |
| local | Geliştirici kendi TCMB EVDS hesabından ücretsiz API key alır; `.env` dosyası `.gitignore`'dadır, asla commit edilmez |
| staging | Vercel/Railway preview ortamı env var'ları, production'dakinden ayrı (test amaçlı, gerekirse sınırlı/deneme API key'i) |
| production | Vercel/Railway proje ayarlarındaki secret store üzerinden enjekte edilir; hiçbir değer repo'da veya CI log'unda görünmez |

## 8. Release ve Rollback Prosedürü

- **Release:** `main`'e merge sonrası Vercel (web) ve Railway (worker+db) kendi otomatik deploy mekanizmasını tetikler ([INF-002]) — ayrı bir manuel deploy adımı veya deploy script'i yoktur.
- **Rollback:** Bir production deploy'u sorunlu çıkarsa, Vercel/Railway'in kendi "önceki deployment'a dön" özelliği kullanılır (her iki platform da geçmiş deployment'ları saklar ve tek tıkla eski sürüme dönmeye izin verir). Ayrı bir blue-green veya canary deploy stratejisi kurulmaz — ölçek ([S-001]) bunu gerektirmez.
- **Veritabanı migration rollback'i:** `02_DATABASE_SCHEMA.md §8`'deki "forward-fix" politikasına uyulur — geri deploy edilen kod eski migration şemasıyla uyumsuzsa, önce yeni bir düzeltici migration yazılır, kod geri alınmaz tek başına.

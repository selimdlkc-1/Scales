### İterasyon 2 — TEFAS Client ve Job (§2.2)

**Hedef:** `clients/tefas-client.ts` + `jobs/tefas-job.ts` çalışır; bozuk veri fixture'larıyla `partial` durum testi yeşil — bu iterasyon `SEC-007`'nin en kritik uygulama noktasıdır (TEFAS resmi olmayan, kırılgan kaynak).

**Teslim çıktısı:**
- `apps/worker/src/clients/tefas-client.ts`
- `apps/worker/src/jobs/tefas-job.ts`
- `apps/worker/src/entrypoints/run-tefas.ts`
- `apps/worker/src/jobs/__fixtures__/tefas-success.json`, `tefas-malformed.json` (birden fazla bozukluk türü)
- `apps/worker/src/jobs/tefas-job.test.ts`

**Önkoşullar:**
- [ ] İterasyon 1 Stop tamam (TCMB job deseni referans alınır)
- [ ] `feat/tefas-client-job` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §2.2 — iterasyon kapsamı ve "en kritik uygulama noktası" notu
2. `docs/07_SECURITY_IMPLEMENTATION.md` §1, §6 — TEFAS threat model'i ve SEC-007 doğrulama zorunluluğu
3. `docs/08_TESTING_STRATEGY.md` §5 — bozuk veri fixture çeşitleri (eksik alan, beklenmeyen tip, boş dizi, TEFAS'a özgü ondalık ayraç varyasyonları)
4. `docs/01_DOMAIN_MODEL.md` §5 — `partial` durum geçişi ve `error_message` içeriği

**Uygulama planı:**
1. `clients/tefas-client.ts` — TEFAS'ın resmi olmayan endpoint'ine `fetch` tabanlı istek; ham yanıtı döner, doğrulama yapmaz.
2. `jobs/tefas-job.ts` — İterasyon 1'deki 3 adımlı akışın aynısı (`docs/04` §7): `pending` → client çağrısı + `tefasResponseSchema.safeParse` (her fon kaydı **tek tek** doğrulanır, tek bir bozuk kayıt tüm job'u durdurmaz) → geçerli kayıtlar `Prisma.$transaction` ile toplu upsert → terminal durum.
3. Doğrulamadan geçemeyen her kayıt atlanır, sayısı ve nedeni `error_message`'a toplanır; en az 1 kayıt geçtiyse durum `partial`, hiçbiri geçmediyse `failed` değil — TEFAS'ta kısmi veri normaldir, `docs/01` §5 tablosundaki `partial` satırı birebir uygulanır.
4. `jobs/__fixtures__/tefas-success.json` (tam geçerli) + `tefas-malformed.json` — en az 3 farklı bozukluk türü: eksik alan, beklenmeyen tip (string yerine sayı vb.), ondalık ayraç varyasyonu (virgül/nokta karışıklığı, `docs/08` §5).
5. `entrypoints/run-tefas.ts` — CLI giriş noktası.
6. `jobs/tefas-job.test.ts` — success + partial (karma iyi/bozuk fixture, doğru sayıda kayıt upsert edilip doğru sayıda atlandığı doğrulanır) + idempotent upsert testi.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `clients/tefas-client.ts`, `jobs/tefas-job.ts`, `jobs/tefas-job.test.ts`, `entrypoints/run-tefas.ts`, `jobs/__fixtures__/tefas-success.json`, `jobs/__fixtures__/tefas-malformed.json` |
| Güncelle | — |
| Dokunma | `jobs/tcmb-job.ts` (İterasyon 1, referans desen — değiştirilmez), `jobs/coingecko-job.ts` (İterasyon 3) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Kayıt-bazlı doğrulama, kısmi atlama | `docs/01_DOMAIN_MODEL.md` §4 madde 6, §5 | Her fon kaydı ayrı `safeParse`, geçerliler transaction'a girer |
| `partial` durumu + hata özeti | `docs/01` §5 tablosu | `error_message`'a atlanan kayıt sayısı/nedeni |
| TEFAS ondalık ayraç varyasyonu | `docs/08_TESTING_STRATEGY.md` §5 | Fixture'da hem `,` hem `.` ayraçlı örnek |
| SEC-007 en kritik nokta | `docs/07_SECURITY_IMPLEMENTATION.md` §1 threat model | Şema asla atlanmaz, gevşetilmez |

**Kalite kapıları:**
- [ ] Fixture success → `success`, tüm kayıtlar upsert
- [ ] Fixture karma (bazı bozuk) → `partial`, doğru sayıda kayıt upsert + doğru sayıda atlama, `error_message` dolu
- [ ] En az 3 farklı bozukluk türü ayrı ayrı test edilmiş (`docs/08` §5)
- [ ] Idempotent upsert testi (aynı gün iki kez çalıştırma)
- [ ] `apps/worker` coverage ≥%60'a katkı

**Bu iterasyonda yok:** CoinGecko job'u (İterasyon 3), ortak retry/state-machine helper'ı (İterasyon 4), cron zamanlaması (İterasyon 5).

**Risk / dikkat:** Şemayı gevşetip (`.strict()` kullanmama, bilinmeyen alanı yok sayma) kabul alanını genişletmek cazip olabilir ama zorunlu alanların tipi asla gevşetilmez — bu SEC-007'nin amacını boşa çıkarır. Testte gerçek TEFAS endpoint'ine **asla** istek atılmaz.

**Stop:**
- [ ] `pnpm --filter worker vitest run jobs/tefas-job.test.ts`
- [ ] PR/onay → İterasyon 3

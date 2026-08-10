### İterasyon 5 — Smoke E2E Testleri (§4.5)

**Hedef:** Playwright ile `docs/08_TESTING_STRATEGY.md §6`'daki 3 kritik journey (ana sayfa yükleme, varlık seçimi, dönem değişikliği) yeşil.

**Teslim çıktısı:**
- `apps/web/playwright.config.ts`
- `apps/web/e2e/{home-load,asset-selection-chart,period-change}.spec.ts`
- `.github/workflows/ci.yml` güncellemesi (ayrı `e2e` job'u)

**Önkoşullar:**
- [ ] İterasyon 4 Stop tamam (S-HOME tüm state'leriyle çalışıyor)
- [ ] `test/e2e-smoke` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §4.5 — iterasyon kapsamı (3 journey, operatör paneli journey'i **Faz 5'te** eklenir)
2. `docs/08_TESTING_STRATEGY.md` §6 — journey listesi ve risk seviyeleri
3. `docs/08_TESTING_STRATEGY.md` §7 — e2e'nin CI'da ayrı job olması, build'i bloklamaması

**Uygulama planı:**
1. Playwright kurulumu — `apps/web/playwright.config.ts`, devDependency.
2. `e2e/home-load.spec.ts` — `/` aç → tablo satırlarının göründüğünü doğrula (Yüksek risk, `docs/08` §6).
3. `e2e/asset-selection-chart.spec.ts` — `/` aç → 3 varlık seç → grafiğin göründüğünü doğrula (Orta risk).
4. `e2e/period-change.spec.ts` — `/` aç → dönem seçiciyi değiştir → tablo verisinin değiştiğini doğrula (Orta risk).
5. `.github/workflows/ci.yml`'e ayrı bir `e2e` job'u ekle — `lint`/`test`/`build`'i bloklamaz, paralel veya sonrasında çalışır (`docs/08` §7).
6. `pnpm --filter web exec playwright test` çalıştır, 3 journey'nin de yeşil olduğunu doğrula.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `apps/web/playwright.config.ts`, `apps/web/e2e/{home-load,asset-selection-chart,period-change}.spec.ts` |
| Güncelle | `apps/web/package.json` (playwright deps), `.github/workflows/ci.yml` (`e2e` job) |
| Dokunma | Operatör paneli journey'i (Faz 5 §5.2'de eklenecek, `/admin` route'u orada kurulur) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Ana sayfa yükleme ve tablo render | `docs/08` §6 | `e2e/home-load.spec.ts` |
| Varlık seçimi ve grafik render | `docs/08` §6 | `e2e/asset-selection-chart.spec.ts` |
| Dönem değişikliği | `docs/08` §6 | `e2e/period-change.spec.ts` |
| e2e ayrı CI job, build'i bloklamaz | `docs/08` §7 | `ci.yml` yeni job |
| Test dosyası yerleşimi | `.claude/rules/35-testing.md` | `apps/web/e2e/*.spec.ts`, birim testlerinden ayrı |

**Kalite kapıları:**
- [ ] 3 journey de Playwright ile yeşil
- [ ] CI'da `e2e` job'u ayrı çalışıyor, `lint`/`test`/`build`'i bloklamıyor ama sonucu görünür
- [ ] Faz 4 Done Definition kontrolü; `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 4 işareti

**Bu iterasyonda yok:** Operatör paneli journey'i (Faz 5 §5.2 — `/admin` route'u orada kurulur), kapsamlı e2e matrisi (her filtre kombinasyonu — `TEST-001` gereği unit/integration'da karşılanır).

**Risk / dikkat:** Playwright testleri gerçek Next.js render + gerçek API route'larına karşı çalışır (fixture değil) — CI'da seed'li bir test DB gerektirir (`docs/08` §5 test veritabanı stratejisiyle tutarlı).

**Stop:**
- [ ] `pnpm --filter web exec playwright test`
- [ ] `git push`, CI'da `e2e` job'u yeşil
- [ ] Faz 4 Done Definition kontrolü; `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 4 işareti
- [ ] PR/onay → Faz 5 (İterasyon 1)

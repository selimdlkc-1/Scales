### İterasyon 5 — Coverage Kapanışı (§5.5)

**Hedef:** `packages/core` ≥%90, `apps/web`/`apps/worker` ≥%60 eşiklerinin gerçek ölçümle doğrulanması; eksik kalan test grupları tamamlanır.

**Teslim çıktısı:**
- Eksik `.test.ts` dosyaları (coverage raporu taranarak tespit edilir)
- `apps/web/vitest.config.ts`, `apps/worker/vitest.config.ts`'e coverage threshold eklenmesi (Faz 1 §1.4'te yalnızca `packages/core`'a eklenmişti)

**Önkoşullar:**
- [ ] İterasyon 4 Stop tamam
- [ ] `test/coverage-closure` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §5.5 — iterasyon kapsamı
2. `docs/08_TESTING_STRATEGY.md` §2–3 — coverage hedefleri, kritik modül tanımı
3. `.claude/rules/04-quality-gates.md` — eşik tablosu

**Uygulama planı:**
1. `pnpm -r vitest run --coverage` — proje genelinde 3 paketin coverage raporunu al.
2. `apps/web/vitest.config.ts`, `apps/worker/vitest.config.ts` — coverage threshold ekle (`lines`/`functions`/`branches`/`statements` ≥%60).
3. Coverage raporundaki eksik alanları (özellikle kritik modüller: `calculations/*`, `schemas/external/*`, `apps/worker/src/jobs/*`) tespit et, eksik testleri tamamla — **gerçek deny senaryoları** hedeflenir, trivial testlerle sayı doldurulmaz.
4. `.github/workflows/ci.yml`'deki `test` job'unun tüm workspace'i (`pnpm -r`) kapsadığını doğrula.
5. `pnpm -r vitest run --coverage` tekrar çalıştırıp tüm eşiklerin karşılandığını doğrula.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | Eksik `.test.ts` dosyaları (proje taramasına göre değişken) |
| Güncelle | `apps/web/vitest.config.ts`, `apps/worker/vitest.config.ts` (thresholds), gerekirse `.github/workflows/ci.yml` |
| Dokunma | `packages/core` (zaten ≥%90, Faz 1'den beri — yalnızca regresyon kontrolü) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| `apps/web` ≥%60 | `docs/08_TESTING_STRATEGY.md` §2 | `vitest.config.ts` thresholds |
| `apps/worker` ≥%60 | `docs/08_TESTING_STRATEGY.md` §2 | `vitest.config.ts` thresholds |
| CI'da eşik altı PR merge edilemez | `.claude/rules/04-quality-gates.md` | `ci.yml` `test` job'u tüm workspace'i kapsar |

**Kalite kapıları:**
- [ ] `packages/core` ≥%90 (regresyon kontrolü)
- [ ] `apps/web` ≥%60
- [ ] `apps/worker` ≥%60
- [ ] CI'da `pnpm -r vitest run --coverage` yeşil

**Bu iterasyonda yok:** Yeni özellik/endpoint/ekran — yalnızca test tamamlama.

**Risk / dikkat:** Coverage eşiğini "kolay" satırlarla (trivial getter/setter testleri) yapay şekilde doldurmak yanlıştır — `docs/08` §4 zorunlu deny senaryolarının gerçekten test edildiğinden emin olunmalı, yalnızca sayı hedefi değil.

**Stop:**
- [ ] `pnpm -r vitest run --coverage` (3 paket de eşiği karşılıyor)
- [ ] PR/onay → İterasyon 6

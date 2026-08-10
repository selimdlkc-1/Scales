### İterasyon 4 — Dependency Taraması CI Entegrasyonu (§5.4)

**Hedef:** Dependabot + `npm audit`/pnpm eşdeğeri CI'a bağlanmış; kritik/yüksek zafiyet build'i bloklamıyor ama uyarıyor (`SEC-008`).

**Teslim çıktısı:**
- `.github/dependabot.yml`
- `.github/workflows/ci.yml` güncellemesi (dependency scan job'u)

**Önkoşullar:**
- [ ] İterasyon 3 Stop tamam
- [ ] `chore/dependency-scanning-ci` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §5.4 — iterasyon kapsamı
2. `docs/08_TESTING_STRATEGY.md` §7 — CI Gate madde 4 (dependency taraması, bloklamaz-uyarır)

**Uygulama planı:**
1. `.github/dependabot.yml` — pnpm ekosistemi, haftalık kontrol, `apps/*`/`packages/*` dizinleri.
2. `.github/workflows/ci.yml`'e 4. job ekle — `pnpm audit` (veya eşdeğeri), sonucu PR yorumu/log olarak bırakır; kritik/yüksek zafiyet varsa **uyarır ama build'i bloklamaz** (`docs/08` §7 madde 4).
3. Bilinçli olarak bilinen düşük seviyeli bir zafiyet senaryosuyla (veya mock) job'un uyarı ürettiğini ve build'i bloklamadığını doğrula.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | `.github/dependabot.yml` |
| Güncelle | `.github/workflows/ci.yml` (4. job: dependency scan) |
| Dokunma | `lint`/`test`/`build` job'ları (sıra değişmez, bu job ek/paralel) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Dependabot haftalık kontrol | `docs/mimari-kararlar.md` SEC-008 | `dependabot.yml` `schedule: weekly` |
| `npm audit`/pnpm eşdeğeri, bloklamaz-uyarır | `docs/08_TESTING_STRATEGY.md` §7 madde 4 | `ci.yml` job'u exit code'u build'i durdurmaz |

**Kalite kapıları:**
- [ ] `dependabot.yml` geçerli syntax, GitHub tarafından tanınıyor
- [ ] CI'da dependency scan job'u çalışıyor, sonucu görünür (log/PR yorumu)
- [ ] Kritik/yüksek zafiyet simülasyonunda build'in bloklanmadığı doğrulanmış

**Bu iterasyonda yok:** Coverage kapanışı (İterasyon 5), go-live (İterasyon 6).

**Risk / dikkat:** `pnpm audit` bazı transitive dev-dependency zafiyetlerinde gürültülü olabilir — yalnızca production dependency'lere odaklanmak (`--prod` benzeri filtre) gürültüyü azaltır; minimal/gürültüsüz bir başlangıç tercih edilir.

**Stop:**
- [ ] `git push`, CI'da dependency scan job'u görünür
- [ ] PR/onay → İterasyon 5

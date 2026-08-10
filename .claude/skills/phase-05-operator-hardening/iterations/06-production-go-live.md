### İterasyon 6 — Production Go-Live (§5.6, Human Gate)

**Hedef:** Staging'de tam doğrulama tamamlanmış (tüm ekranlar, tüm job'lar en az bir kez gerçek veriyle çalışmış); proje sahibinin açık onayıyla production seed'i tek seferlik çalıştırılmış, DNS/domain bağlanmış.

**Teslim çıktısı:**
- Staging tam doğrulama kaydı
- Production seed çalıştırma kaydı (tek seferlik)
- DNS/domain bağlantısı
- Go-live checklist'i (proje sahibiyle birlikte gözden geçirilmiş, PR açıklamasında belgelenmiş)

**Önkoşullar:**
- [ ] İterasyon 5 Stop tamam (tüm coverage eşikleri karşılanıyor)
- [ ] İterasyon 1–4 tüm sertleştirme adımları (auth, güvenlik başlıkları, dependency taraması) production'da da aktif olacak şekilde deploy edilebilir durumda
- [ ] `chore/production-go-live` branch'i açıldı
- [ ] **Proje sahibi onayı:** canlıya alma onayı bu iterasyondan önce alınmış olmalı (`docs/10_IMPLEMENTATION_ROADMAP.md §4` human gate tablosu, "Faz 5 §5.6 production go-live" satırı)

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §5.6 — iterasyon kapsamı
2. `docs/10_IMPLEMENTATION_ROADMAP.md` §4 — human gate tablosu, go-live satırı
3. `docs/02_DATABASE_SCHEMA.md` §9 — production seed kapsamı (tek seferlik, operatör onaylı)
4. `docs/09_DEV_WORKFLOW.md` §5, §8 — ortamlar, release/rollback prosedürü

**Uygulama planı:**
1. Staging'de tam doğrulama — tüm ekranlar (`S-HOME`, `S-OPERATOR-PANEL`, `S-404`, `S-500`) + tüm job'lar (TCMB/TEFAS/CoinGecko) en az bir kez gerçek veriyle çalışmış olmalı.
2. **Proje sahibi onayını bekle** — bu iterasyonun Önkoşullar'ındaki adımdır; onay yoksa production adımlarına geçilmez, iterasyon burada durur.
3. Onay sonrası: production seed'in tek seferlik çalıştırılması (`docs/02` §9 production satırı — yalnızca `asset_classes`/`assets`; `asset_prices`/`cpi_index` yalnızca worker job'ları yazar, seed'e dahil değildir).
4. DNS/domain bağlama (Vercel/Railway proje ayarları).
5. Go-live checklist'i proje sahibiyle birlikte gözden geçir — tüm coverage eşikleri (İterasyon 5), güvenlik başlıkları (İterasyon 3), dependency taraması (İterasyon 4) yeşil olmalı.

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | — (operasyonel adım; kod değişikliği yok) |
| Güncelle | — |
| Dokunma | — |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| Production seed tek seferlik, operatör onaylı | `docs/02_DATABASE_SCHEMA.md` §9 | Elle tetiklenir, otomatik değildir |
| Go-live human gate | `docs/10_IMPLEMENTATION_ROADMAP.md` §4 tablosu | Proje sahibi onayı olmadan production deploy yapılmaz |
| Staging tam doğrulama önkoşulu | `docs/09_DEV_WORKFLOW.md` §5 | Her PR staging'de sorunsuz olmalı |

**Kalite kapıları:**
- [ ] Staging'de tüm ekranlar + tüm job'lar en az bir kez gerçek veriyle doğrulanmış
- [ ] Tüm coverage eşikleri (İterasyon 5) hâlâ karşılanıyor
- [ ] Güvenlik başlıkları + dependency taraması (İterasyon 3–4) production'da da aktif
- [ ] **Human gate:** proje sahibi go-live onayı alınmış (kayıt altında)

**Bu iterasyonda yok:** Yeni özellik — bu iterasyon yalnızca doğrulama + deploy'dur.

**Risk / dikkat:** Bu, roadmap'in en kritik insan onay noktasıdır (`docs/10` §4 — "projenin tamamının ilk kez gerçek kullanıcıya açılma anı") — agent hiçbir production adımını (seed, DNS, deploy) proje sahibinin açık onayı olmadan **başlatmaz**.

**Stop:**
- [ ] Staging tam doğrulama tamamlandı
- [ ] **Human gate:** proje sahibi go-live onayı alındı
- [ ] Production seed (tek seferlik) çalıştırıldı
- [ ] DNS/domain bağlandı
- [ ] Faz 5 Done Definition + proje geneli Done Definition kontrolü; `docs/10_IMPLEMENTATION_ROADMAP.md` Faz 5 işareti
- [ ] Proje tamamlandı — yeni faz yok

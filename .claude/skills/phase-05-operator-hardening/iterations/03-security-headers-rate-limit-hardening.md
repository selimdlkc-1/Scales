### İterasyon 3 — HTTP Güvenlik Başlıkları ve Rate Limit Sertleştirmesi (§5.3)

**Hedef:** CSP/CORS/HSTS başlıkları `next.config.js` üzerinden merkezi aktif; `/api/admin/*` başarısız Basic Auth denemesi için ayrı brute-force rate limit (dakikada 10 deneme) çalışıyor.

**Teslim çıktısı:**
- `apps/web/next.config.js` (`headers()` fonksiyonu)
- `lib/middleware/with-admin-auth.ts` güncellemesi (brute-force sayaç)

**Önkoşullar:**
- [ ] İterasyon 2 Stop tamam
- [ ] `chore/security-headers-rate-limit-hardening` branch'i açıldı

**Docs okuma sırası:**
1. `docs/10_IMPLEMENTATION_ROADMAP.md` §5.3 — iterasyon kapsamı
2. `docs/07_SECURITY_IMPLEMENTATION.md` §7–8 — HTTP güvenlik başlıkları tablosu, rate limiting/brute-force koruması
3. `.claude/rules/03-security-baseline.md` — zorunlu kontrol #6 (header/CORS merkezi konfigürasyon)

**Uygulama planı:**
1. `next.config.js` `headers()` — `Content-Security-Policy` (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `CORS` (yalnızca production domain'i, wildcard yok) — tüm route'lara **merkezi** (`docs/07` §7).
2. `lib/middleware/with-admin-auth.ts` güncelle — başarısız Basic Auth denemesi için **ayrı** bir rate limit sayacı (IP başına dakikada 10 deneme; aşımda doğru credential'la bile `429`, `docs/07` §8).
3. Integration test — response header'larında CSP/`X-Frame-Options`/HSTS var mı kontrolü; 11. başarısız admin auth denemesi → `429` (doğru credential'la bile).

**Dosya kapsamı:**

| İşlem | Path |
| --- | --- |
| Oluştur | — |
| Güncelle | `apps/web/next.config.js`, `lib/middleware/with-admin-auth.ts` (brute-force sayaç) |
| Dokunma | Diğer route handler'lar (header'lar route bazında tekrar tanımlanmaz, `.claude/rules/03-security-baseline.md` kontrol #6) |

**Spec → kod eşlemesi:**

| Gereksinim | Docs referansı | Uygulama notu |
| --- | --- | --- |
| CSP/`X-Frame-Options`/HSTS/`Referrer-Policy` | `docs/07` §7 | `next.config.js` `headers()` merkezi |
| CORS yalnızca production domain | `docs/07` §7 | Wildcard yasak |
| Admin brute-force 10/dk, `429` doğru credential'la bile | `docs/07` §8 | `with-admin-auth.ts` ayrı sayaç |
| Route bazında header tanımlama yasak | `.claude/rules/03-security-baseline.md` #6 | `next.config.js` tek merkez |

**Kalite kapıları:**
- [ ] Tüm route'larda CSP/`X-Frame-Options`/HSTS header'ları mevcut (integration test)
- [ ] 11. başarısız admin auth denemesi → `429`, doğru credential'la bile (`docs/08` §4 rate limit deny senaryosunun admin varyantı)
- [ ] CORS wildcard kullanılmıyor

**Bu iterasyonda yok:** Dependency taraması (İterasyon 4), coverage kapanışı (İterasyon 5).

**Risk / dikkat:** CSP çok sıkı olursa shadcn/ui'nin (Radix tabanlı) bazı inline-style kullanan bileşenleri bozulabilir — `style-src 'unsafe-inline'` bilinçli olarak eklenmiştir (`docs/07` §7); `script-src`'de asla `'unsafe-inline'` kullanılmaz.

**Stop:**
- [ ] `pnpm --filter web vitest run` (header + brute-force testleri)
- [ ] PR/onay → İterasyon 4

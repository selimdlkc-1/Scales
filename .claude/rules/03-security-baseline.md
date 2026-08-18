# Güvenlik Taban Çizgisi

Hedef seviye pragmatik/temel (OWASP Top 10 temel önlemleri); ağır uyum çerçevesi hedeflenmez ([SEC-001]). Kullanıcı hesabı/PII yok — KVKK/GDPR yükümlülükleri v1'de uygulanmaz ([P-002], [SEC-010]).

## Zorunlu 6 kontrol (executable checklist)

1. Hiçbir endpoint kullanıcıdan gelen veriyi **Zod şeması olmadan** işlemez.
2. `/api/admin/*` ve `/admin/**` her zaman `withAdminAuth`/middleware ile korunur; yeni bir admin route eklerken bu sarmalama atlanmaz.
3. Secrets (API key, operatör credential'ı) kod, log veya commit mesajına **asla** yazılmaz; log middleware'indeki maskeleme listesi (`OPERATOR_PASSWORD`, `OPERATOR_USERNAME`, `TCMB_EVDS_API_KEY`, `COINGECKO_API_KEY`, `Authorization`) yeni bir secret eklendiğinde güncellenir.
4. Dış kaynaktan (TCMB/TEFAS/CoinGecko) gelen her yanıt DB'ye yazılmadan önce şema doğrulamasından geçer; doğrulama atlanmaz.
5. Tüm SQL erişimi Prisma üzerinden, parametrik sorgu ile yapılır; ham string birleştirme (`$queryRawUnsafe`) yasaktır.
6. Yeni bir response header/CORS değişikliği `next.config.js` merkezi konfigürasyonundan yapılır, route bazında ayrıca tanımlanmaz — **istisna: `Content-Security-Policy`**, Next.js'in inline RSC hydration script'leri yüzünden nonce gerektirir ve `apps/web/middleware.ts`'te (tüm route'ları kapsayan TEK merkez) üretilir, `next.config.js`'te değil (docs/07 §7, İterasyon 3/§5.3).

## Agent'ın yapmaması gerekenler ([CODE-001])

- ✗ Parasal/fiyat hesaplamalarında `float`/`Number` kullanmak — her yerde `DECIMAL`/`NUMERIC` ve string-safe hesap.
- ✗ Herhangi bir ekranda tavsiye dili ("al", "sat", "iyi seçenek", "önerilir") veya sıralama-bazlı öneri.
- ✗ Frontend'den doğrudan TCMB/TEFAS/CoinGecko'ya istek atmak — tüm okuma kendi API/DB'sinden servis edilir.
- ✗ Dış kaynak verisini şema doğrulamasından geçirmeden veritabanına yazmak.
- ✗ `packages/core` coverage'ını %90 altına düşürmek.
- ✗ Kullanıcı hesabı/auth/kişiselleştirme eklemek — v1 kapsamı dışı, önce `docs/mimari-kararlar.md` güncellenir.
- ✗ Proje sahibi onayı olmadan `main`'e merge etmek.

## Kimlik doğrulama modeli

İki bağlam: (a) anonim ziyaretçi — kimlik doğrulama yok; (b) operatör paneli — stateless HTTP Basic Auth (`OPERATOR_USERNAME`/`OPERATOR_PASSWORD`), token/session/cookie yok. Deny-by-default: `/admin/**` middleware matcher'ı + her `/api/admin/*` route'unun `withAdminAuth` sarmalaması, birbirinden bağımsız iki katman (defense in depth).

## Rate limiting

Genel API: IP başına dk 60 istek. `/api/admin/*` başarısız Basic Auth: IP başına dk 10 deneme, aşımda doğru credential'la bile `429`. Sayaçlar in-memory; ayrı Redis kurulmaz.

---
Detay: `docs/07_SECURITY_IMPLEMENTATION.md` (tam, özellikle §2-9, Executable Checklist); `docs/mimari-kararlar.md` §10, §17

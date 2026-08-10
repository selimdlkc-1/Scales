---
name: add-new-screen
description: Step-by-step procedure for adding a new route/screen under apps/web/app — page/layout wiring, DataState/DisclaimerFooter reuse, screen catalog entry. Use when the user asks to add a new page, route, or admin sub-screen. Do NOT use for adding a new component inside an existing screen (no dedicated skill needed — follow 24-frontend-components.md directly) or for changing an existing screen's API contract (use add-new-endpoint).
---

# Yeni Ekran/Route Ekleme Prosedürü

Terazi minimal bir ekran setine sahiptir (v1: 4 ekran) — yeni bir route eklemek [P-001]/[P-002] kapsamını genişletir, önce bunun gerekçesi net olmalı. 5 adım.

## 1. Ekran ID'sini ve route'u belirle

Format `S-<DOMAIN>` veya `S-<DOMAIN>-<ACTION>` (`docs/06_SCREEN_CATALOG.md §3`). Route hangi layout'a bağlanacak (kök mü, `/admin` altı mı) netleştir.

## 2. Sayfa dosyasını oluştur

`apps/web/app/<route>/page.tsx` — Server Component varsayılan; ilk yükleme servis katmanından doğrudan çekilir, gereksiz client fetch turu yapılmaz (bkz. `20-frontend-architecture.md`).

## 3. Auth/koruma gerekiyorsa

`/admin/**` altındaysa `apps/web/middleware.ts` matcher'ının route'u kapsadığını doğrula — yeni bir korumalı alan **her zaman** deny-by-default olmalı, allow-list eklemek yeterli değildir.

## 4. Ortak bileşenleri kullan, kopyalama

`DisclaimerFooter` (kullanıcıya yönelik her ekranda, [P-006]), `DataState` (loading/error/empty/success), `StatusBadge`. Yeni bir ekran kendi ad-hoc metnini yazmadan önce bu bileşenlerin genişletilip genişletilemeyeceğini değerlendir.

## 5. Dokümantasyon

- [ ] `docs/06_SCREEN_CATALOG.md` — yeni ekran için tam veya kısa şablon eklendi (route, layout, erişim yetkisi, alan listesi, UX state'leri, kullanılan endpoint'ler, TR mesaj metinleri).
- [ ] Smoke e2e test eklendi (kritik akışsa, `08_TESTING_STRATEGY.md §6`).

---
Detay: `docs/06_SCREEN_CATALOG.md`; `docs/05_FRONTEND_SPEC.md §2-3`

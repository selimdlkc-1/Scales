---
name: fix-failing-test
description: Procedure for diagnosing and fixing a red CI job (lint/test/build) or a locally failing test, without silently loosening coverage thresholds or deny-scenario tests. Use when the user reports a CI failure, a broken test, or asks to make the pipeline green again. Do NOT use to write new tests for new functionality (that's part of the normal feature workflow, not a fix).
---

# CI/Test Kırığı Düzeltme Prosedürü

CI (lint → test → build → dependency taraması, [INF-002]) sırayla çalışır — hangi adımda kırıldığını önce belirle. 4 adım.

## 1. Kırığın kaynağını izole et

- **Lint:** ESLint/Prettier hatası — kod stilini düzelt, kuralı gevşetme.
- **Test:** Kırmızı test mi, coverage eşiği mi (`08_TESTING_STRATEGY.md §2`)? İkisi farklı tedavi gerektirir.
- **Build:** Tip hatası/derleme hatası — `apps/web` mi `apps/worker` mi?

## 2. Kök nedeni düzelt, testi gevşetme

- ✗ Coverage eşiğinin altına düşüldüyse eşik konfigürasyonunu düşürmek.
- ✗ Kırmızı bir deny-senaryo testini (`04-quality-gates.md`) `skip`/`it.todo` ile geçiştirmek.
- ✓ Testin beklediği davranışı geri getiren kod değişikliği, veya test gerçekten yanlışsa (spec değişti) önce `docs/` güncellenip test buna göre düzeltilir.

## 3. Kritik modül ise ekstra dikkat

`calculations/real-return.ts`, `calculations/normalized-return.ts`, `schemas/external/*.ts`, `apps/worker/src/jobs/*.ts` — bu dörtte bir kırık test, çoğunlukla gerçek bir hesap/doğrulama hatasına işaret eder; "testi geçir" yerine "neden yanlış hesaplıyor"u araştır.

## 4. Doğrula ve kapat

- [ ] `pnpm lint && pnpm test && pnpm build` lokalde yeşil.
- [ ] Coverage eşikleri (`04-quality-gates.md`) korunuyor.
- [ ] Kök neden bir mimari karar sapmasıysa önce `write-adr`.

---
Detay: `docs/08_TESTING_STRATEGY.md §7`; `docs/09_DEV_WORKFLOW.md §3`

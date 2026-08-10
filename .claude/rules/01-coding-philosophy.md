# Çalışma Felsefesi

[P-004] ilkesi: proje bir vitrin/portföy çalışmasıdır, trafik düşüktür — **veri katmanı kalitesi ve mühendislik pratikleri UI cilasından önceliklidir**. Şık ama kırılgan bir arayüz yerine çalışan, doğru, test edilmiş bir veri katmanı tercih edilir.

## Faz disiplini

- 1 chat ≈ 1 PR ≈ `docs/10_IMPLEMENTATION_ROADMAP.md`'deki tek bir `§N.M` alt maddesi. Birden fazla alt madde karıştırılmaz.
- Fazlar sırayla ilerler (Faz 0→1→2→3→4→5); önceki fazın alt maddeleri bitmeden sıradakine geçilmez.
- Her faz sonunda **human gate** vardır — agent onaysız bir sonraki faza geçmez.

## Test-first ve self-review

- ✓ Hesaplama fonksiyonu (`packages/core/src/calculations/*`) yazılmadan önce/ile birlikte unit test yazılır — bu proje için asıl "iş" burasıdır.
- ✗ "Önce çalıştır, testi sonra eklerim" — `packages/core` için %90+ coverage her yeni fonksiyonda korunur ([TEST-002], [CODE-001] madde 5).
- Bir değişiklik "tamamlandı" sayılmadan önce ([CODE-005]): (1) ilgili test yazıldı ve geçiyor, (2) coverage eşiği korundu, (3) `03-security-baseline.md` yasak listesine aykırılık yok, (4) mimari karar gerektiren bir seçim varsa önce `docs/` güncellendi, (5) CI yeşil.

## Vibe coding disiplini

- Yeni bir mimari karar gerektiren özellik/kütüphane eklenmeden önce `docs/mimari-kararlar.md` güncellenir — agent onaysız kapsam genişletmesi yapmaz ([Kısıt #Süre/kapsam]).
- Spec değişikliği her zaman sırayla yayılır: `mimari-kararlar.md` → ilgili `docs/NN` → `.claude/rules`/`CLAUDE.md` → etkilenen faz skill'i (`docs/10_IMPLEMENTATION_ROADMAP.md §8`). Bu sıra tersine çalışılmaz (önce kod, sonra doküman yasak).

## Onaysız merge yasağı

Agent kullanıcı onayı olmadan `main`'e merge etmez ([TEST-005]) — CI yeşil olması yeterli koşul değildir. `--no-verify` ile hook atlanmaz, `git push --force` ile `main` geçmişi değiştirilmez.

---
Detay: `docs/mimari-kararlar.md` §1, §16, §17; `docs/09_DEV_WORKFLOW.md §3-4`; `docs/10_IMPLEMENTATION_ROADMAP.md §1, §8`

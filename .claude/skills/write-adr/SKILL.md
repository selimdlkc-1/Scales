---
name: write-adr
description: Step-by-step procedure for recording a new or changed architecture decision in docs/mimari-kararlar.md and cascading it through the docs/ and rules pipeline. Use when the user proposes a new library/framework, a scope change, a new data source, or any choice that isn't already covered by an existing decision ID in docs/mimari-kararlar.md. Do NOT use for implementation details that don't change an architectural decision (just write the code) or for phase planning (use phase-creator).
---

# Mimari Karar (ADR) Ekleme Prosedürü

`docs/mimari-kararlar.md` tek doğruluk kaynağıdır — kod önce, doküman sonra çalışılmaz ([CODE-005] madde 4). 4 adım.

## 1. Kararı ilgili bölüme ekle

`docs/mimari-kararlar.md`'de ilgili bölüme (§1-17) `[KATEGORI-SIRA]` formatında karar ID'si ile ekle (örn. `[TS-010]`). Var olan bir kararla çelişiyorsa önce onu güncelle, sessizce yenisini ekleme.

## 2. Açık madde ise işaretle

Karar henüz netleşmediyse §18'e `[KATEGORI-OPEN-N]` öncelik etiketiyle (🔴/🟡/🟢) eklenir; netleştiğinde listeden silinir.

## 3. Versiyon geçmişine not düş

Dokümanın sonundaki tabloya bir satır: versiyon, tarih, hangi karar ID'lerinin eklendiği/değiştiği.

## 4. Downstream'i güncelle (sıra bağlayıcı)

Bu sıra atlanmaz ([CODE-005] madde 4, `docs/10_IMPLEMENTATION_ROADMAP.md §8`):

1. `docs/mimari-kararlar.md` güncellendi (bu adım).
2. İlgili `docs/00-10` dokümanı(ları) elle veya `docs-architect` ile güncellenir.
3. `.claude/rules/` ve `CLAUDE.md` (rules-architect çıktısı) güncellenir — yeni karar bir path-scoped rule veya koşulsuz rule'u etkiliyorsa.
4. Etkilenen, **henüz başlamamış** faz alt maddeleri `phase-creator` ile yeniden planlanır — tamamlanmış fazlar geriye dönük değiştirilmez.

- [ ] Karar kodda uygulanmadan önce bu 4 adım tamamlandı.

---
Detay: `docs/mimari-kararlar.md` "Nasıl Kullanılır?"; `docs/10_IMPLEMENTATION_ROADMAP.md §8`

---
name: git-phase-branch
description: Procedure for opening a feature branch and PR aligned to the "1 chat ≈ 1 PR ≈ 1 roadmap §N.M" discipline before starting phase implementation work. Use when the user says to start work on a phase/iteration, or before writing the first line of code for a docs/10_IMPLEMENTATION_ROADMAP.md sub-item. Do NOT use for hotfixes unrelated to the phase roadmap, or after a branch for the current §N.M already exists in this session.
---

# Faz Branch/PR Disiplini

`docs/10_IMPLEMENTATION_ROADMAP.md §1`: 1 chat ≈ 1 PR ≈ tek bir `§N.M` alt maddesi. Bir branch birden fazla alt madde karıştırmaz. 4 adım.

## 1. Bağımlılığı doğrula

Hedeflenen `§N.M`'nin bağımlı olduğu önceki fazlar/alt maddeler tamamlanmış mı (`10_IMPLEMENTATION_ROADMAP.md §2` bağımlılık tablosu)? Değilse önce onu bitir veya kullanıcıya bildir.

## 2. Branch aç

`main`'den dallan, `<tip>/<kısa-açıklama>` (örn. `feat/comparison-table`, tip = commit tipiyle aynı sözlük, `02-language-naming.md`). Doğrudan `main`'e commit yapılmaz.

## 3. Kod öncesi kapsamı sabitle

Mesajda/PR taslağında hangi `§N.M`'nin hedeflendiğini belirt; o alt maddenin "Done Definition"ı (varsa ilgili `phase-XX-*` skill'i) kontrol listesi olarak tut.

## 4. PR açılışı ve merge

- PR açıklaması `Faz N — §N.M` referansını içerir.
- `09_DEV_WORKFLOW.md §3` PR checklist'i (test, coverage, güvenlik yasak listesi, docs güncelliği, CI) tam sağlanmadan "tamamlandı" denmez.
- **Merge için proje sahibinin açık onayı gerekir** — CI yeşil olması yeterli değildir ([TEST-005], `01-coding-philosophy.md`). Agent PR'ı açar, CI'ı doğrular, sonucu bildirir; "merge et" denmeden merge etmez.

---
Detay: `docs/09_DEV_WORKFLOW.md §1, §3-4`; `docs/10_IMPLEMENTATION_ROADMAP.md §1-2`

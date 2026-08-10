# Dil ve İsimlendirme

Arayüz dili **Türkçe**, kod tanımlayıcıları **İngilizce** (hybrid convention, [P-005]). Doküman prosa Türkçe, teknik terim İngilizce.

## Naming convention ([CODE-003])

| Öğe | Konvansiyon | Örnek |
| --- | --- | --- |
| Klasör/dosya | `kebab-case` | `real-return.ts`, `asset-repository.ts` |
| Component/Type | `PascalCase` | `ComparisonTable`, `AssetPrice` |
| Fonksiyon/değişken | `camelCase` | `calculateRealReturn`, `assetClassId` |
| Constant/enum değeri | `UPPER_SNAKE_CASE` | `MAX_ASSET_SELECTION` |
| DB tablo/kolon | `snake_case`, tablo çoğul | `asset_prices`, `as_of_date` |

✓ `nominal-return.test.ts` yanında `nominal-return.ts` (aynı klasör) — ✗ ayrı `__tests__/` klasörü.

## Commit ve branch

- Conventional Commits, İngilizce: `feat:`, `fix:`, `chore:`, `test:`, `refactor:`, `docs:` ([CODE-004]).
- Örnek: `feat(worker): add TEFAS job retry with exponential backoff`
- Branch: `<tip>/<kısa-açıklama>` (`feat/comparison-table`, `fix/tefas-parser-null-check`); bir branch birden fazla faz alt maddesi karıştırmaz.
- `main`'e doğrudan commit yapılmaz.

## Error code pattern

API hata kodları `error.code` alanında sabit, `UPPER_SNAKE_CASE` sözlükten gelir (`VALIDATION_ERROR`, `ASSET_NOT_FOUND` vb.) — yeni bir hata durumu için ad-hoc string üretilmez, önce sözlüğe eklenir.

---
Detay: `docs/mimari-kararlar.md` §17 (CODE-003/004); `docs/09_DEV_WORKFLOW.md §1-2`; `docs/03_API_CONTRACTS.md §3`

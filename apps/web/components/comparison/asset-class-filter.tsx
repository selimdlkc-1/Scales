'use client';

import type { AssetClassDto } from '@/lib/services/reference-data-service';

export interface AssetClassFilterProps {
  assetClasses: AssetClassDto[];
  /** Seçili sınıf kodları — boşsa tümü gösterilir kuralı burada değil, tüketen tarafta uygulanır. */
  selected: string[];
  onChange: (selected: string[]) => void;
}

/**
 * Varlık sınıfı filtresi — çoklu seçim checkbox grubu (Döviz/Altın/Kripto/Yatırım
 * Fonu, docs/06_SCREEN_CATALOG.md §4). "Hiçbiri seçilmezse tümü gösterilir"
 * kuralı bu bileşende değil, filtreyi tüketen tarafta uygulanır.
 *
 * Composite bileşen: props üzerinden veri alır, kendi içinde fetch yapmaz
 * (.claude/rules/24-frontend-components.md). Native `<input type="checkbox">`
 * + `<label>` — klavye erişimi tarayıcı varsayılanıyla gelir ([05] §8).
 */
export function AssetClassFilter({ assetClasses, selected, onChange }: AssetClassFilterProps) {
  function toggle(code: string) {
    if (selected.includes(code)) {
      onChange(selected.filter((item) => item !== code));
    } else {
      onChange([...selected, code]);
    }
  }

  return (
    <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
      <legend className="mb-1 text-sm font-medium text-foreground">Varlık sınıfı</legend>
      {assetClasses.map((assetClass) => (
        <label key={assetClass.code} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(assetClass.code)}
            onChange={() => toggle(assetClass.code)}
            className="h-4 w-4 rounded border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {assetClass.nameTr}
        </label>
      ))}
    </fieldset>
  );
}

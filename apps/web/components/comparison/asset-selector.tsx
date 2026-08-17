'use client';

import { useId, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import type { AssetDto } from '@/lib/services/reference-data-service';
import { cn } from '@/lib/utils';

/** `app/comparison-panel.tsx` bu sabitleri fetch-tetikleme eşiği için de kullanır. */
export const MIN_ASSETS = 2;
export const MAX_ASSETS = 5;
const MAX_SELECTION_MESSAGE = 'En fazla 5 varlık karşılaştırabilirsiniz.';

export interface AssetSelectorProps {
  /** Aktif varlık listesi (tüm sınıflar) — `GET /api/assets` (docs/03 §5.1). */
  assets: AssetDto[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

/**
 * Grafik için varlık seçimi — aranabilir çoklu seçim (docs/06_SCREEN_CATALOG.md §4,
 * docs/05_FRONTEND_SPEC.md §5). Min 2, maks 5; 5. seçimden sonra diğer seçenekler
 * UI'da `disabled` olur. Devre dışı bırakılan seçeneğin `<label>`'ı (kendisi disabled
 * değil, yalnızca içindeki checkbox) `title` taşır — 6. seçim denemesinde tarayıcı
 * native tooltip'i "En fazla 5 varlık karşılaştırabilirsiniz." metnini gösterir
 * (docs/06 §4 TR mesaj metni); aynı metin klavye/ekran okuyucu kullanıcıları için
 * kalıcı bir metin olarak da (`atLimit` durumunda) gösterilir.
 *
 * Composite bileşen: yalnızca props üzerinden veri alır, kendi içinde fetch yapmaz
 * (.claude/rules/24-frontend-components.md).
 */
export function AssetSelector({ assets, selected, onChange }: AssetSelectorProps) {
  const [query, setQuery] = useState('');
  const searchInputId = useId();

  const atLimit = selected.length >= MAX_ASSETS;

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
    if (normalizedQuery.length === 0) return assets;
    return assets.filter(
      (asset) =>
        asset.symbol.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
        asset.nameTr.toLocaleLowerCase('tr-TR').includes(normalizedQuery),
    );
  }, [assets, query]);

  function toggle(symbol: string) {
    if (selected.includes(symbol)) {
      onChange(selected.filter((item) => item !== symbol));
      return;
    }
    // 5. seçimden sonra ek seçim engellenir — checkbox zaten `disabled`, bu
    // yalnızca ikinci bir güvenlik ağı (docs/05 §5).
    if (atLimit) return;
    onChange([...selected, symbol]);
  }

  return (
    <div className="space-y-2">
      <label htmlFor={searchInputId} className="text-sm font-medium text-foreground">
        Grafik için varlık seçimi
      </label>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((symbol) => {
            const asset = assets.find((item) => item.symbol === symbol);
            const label = asset?.nameTr ?? symbol;
            return (
              <li key={symbol}>
                <Badge variant="secondary" className="gap-1 pr-1">
                  {label}
                  <button
                    type="button"
                    onClick={() => toggle(symbol)}
                    aria-label={`${label} seçimini kaldır`}
                    className="ml-1 rounded-full px-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    ×
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
      )}

      <input
        id={searchInputId}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Varlık ara…"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />

      <fieldset className="max-h-48 space-y-0.5 overflow-y-auto rounded-md border p-2">
        <legend className="sr-only">Varlık listesi</legend>
        {filteredAssets.length === 0 && (
          <p className="px-1 py-1 text-sm text-muted-foreground">Eşleşen varlık bulunamadı.</p>
        )}
        {filteredAssets.map((asset) => {
          const isSelected = selected.includes(asset.symbol);
          const isDisabled = !isSelected && atLimit;
          return (
            <label
              key={asset.symbol}
              title={isDisabled ? MAX_SELECTION_MESSAGE : undefined}
              className={cn(
                'flex items-center gap-2 rounded px-1 py-1 text-sm',
                isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted',
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggle(asset.symbol)}
                className="h-4 w-4 rounded border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span>{asset.nameTr}</span>
              <span className="text-muted-foreground">({asset.symbol})</span>
            </label>
          );
        })}
      </fieldset>

      {atLimit && <p className="text-xs text-muted-foreground">{MAX_SELECTION_MESSAGE}</p>}
      {selected.length > 0 && selected.length < MIN_ASSETS && (
        <p className="text-xs text-muted-foreground">
          {`Grafiği görüntülemek için en az ${MIN_ASSETS - selected.length} varlık daha seçin.`}
        </p>
      )}
    </div>
  );
}

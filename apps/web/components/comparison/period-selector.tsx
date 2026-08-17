'use client';

import type { ComparisonPeriod } from '@/lib/services/comparison-service';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS: { value: ComparisonPeriod; label: string }[] = [
  { value: '1m', label: '1A' },
  { value: '3m', label: '3A' },
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
  { value: '5y', label: '5Y' },
];

export interface PeriodSelectorProps {
  value: ComparisonPeriod;
  onChange: (period: ComparisonPeriod) => void;
}

/**
 * Dönem seçici — segmented control 1A/3A/1Y/3Y/5Y (docs/06_SCREEN_CATALOG.md §4).
 *
 * Composite bileşen: yalnızca props üzerinden değer/callback alır, kendi
 * içinde fetch yapmaz (.claude/rules/24-frontend-components.md). Native
 * `<button>` kullanılır — Tab/Enter/Space klavye erişimi tarayıcı
 * varsayılanıyla gelir, ayrı bir `onClick`-only davranış eklenmez ([05] §8).
 */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div role="group" aria-label="Dönem seçici" className="inline-flex rounded-md border p-1">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === option.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

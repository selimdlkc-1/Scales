'use client';

import { useCallback, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AssetClassFilter } from '@/components/comparison/asset-class-filter';
import { ComparisonTable } from '@/components/comparison/comparison-table';
import { PeriodSelector } from '@/components/comparison/period-selector';
import { Button } from '@/components/ui/button';
import { ComparisonFetchError, fetchComparison } from '@/lib/fetchers/comparison-fetcher';
import type {
  ComparisonPeriod,
  ComparisonResult,
  ComparisonRow,
  ComparisonSortBy,
  ComparisonSortDir,
} from '@/lib/services/comparison-service';
import type { AssetClassDto } from '@/lib/services/reference-data-service';

const GENERIC_ERROR_MESSAGE = 'Veriler yüklenirken bir sorun oluştu.';

export interface ComparisonPanelProps {
  initialResult: ComparisonResult;
  initialPeriod: ComparisonPeriod;
  initialSortBy: ComparisonSortBy;
  initialSortDir: ComparisonSortDir;
  initialSelectedClasses: string[];
  assetClasses: AssetClassDto[];
}

/**
 * S-HOME'un interaktif kabuğu. `app/page.tsx` (Server Component) `searchParams`'tan
 * çözdüğü ilk filtre/veri setini buraya devreder — `useSearchParams`/`useRouter` gibi
 * client hook'ları gerektiren filtre etkileşimi (docs/05_FRONTEND_SPEC.md §4) bu yüzden
 * ayrı bir client dosyada yaşar. `components/comparison/*` altındaki composite'lerin
 * aksine bu dosya fetch + URL state orkestrasyonu yapar — mimari olarak "Feature/page"
 * katmanının (.claude/rules/24-frontend-components.md) bir parçasıdır, yalnızca
 * Next.js'in server/client sınırı nedeniyle `app/page.tsx`'ten ayrı bir dosyaya konmuştur.
 */
export function ComparisonPanel({
  initialResult,
  initialPeriod,
  initialSortBy,
  initialSortDir,
  initialSelectedClasses,
  assetClasses,
}: ComparisonPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [period, setPeriod] = useState(initialPeriod);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDir, setSortDir] = useState(initialSortDir);
  const [selectedClasses, setSelectedClasses] = useState(initialSelectedClasses);
  const [rows, setRows] = useState<ComparisonRow[]>(initialResult.rows);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateUrl = useCallback(
    (next: {
      period: ComparisonPeriod;
      sortBy: ComparisonSortBy;
      sortDir: ComparisonSortDir;
      classes: string[];
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('period', next.period);
      params.set('sortBy', next.sortBy);
      params.set('sortDir', next.sortDir);
      if (next.classes.length > 0) {
        params.set('classes', next.classes.join(','));
      } else {
        params.delete('classes');
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const loadComparison = useCallback(
    (next: { period: ComparisonPeriod; sortBy: ComparisonSortBy; sortDir: ComparisonSortDir }) => {
      setError(null);
      startTransition(() => {
        fetchComparison(next)
          .then((result) => setRows(result.rows))
          .catch((fetchError: unknown) => {
            const message =
              fetchError instanceof ComparisonFetchError
                ? fetchError.message
                : GENERIC_ERROR_MESSAGE;
            setError(message);
          });
      });
    },
    [],
  );

  function handlePeriodChange(nextPeriod: ComparisonPeriod) {
    setPeriod(nextPeriod);
    updateUrl({ period: nextPeriod, sortBy, sortDir, classes: selectedClasses });
    loadComparison({ period: nextPeriod, sortBy, sortDir });
  }

  function handleSortChange(nextSortBy: ComparisonSortBy, nextSortDir: ComparisonSortDir) {
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
    updateUrl({ period, sortBy: nextSortBy, sortDir: nextSortDir, classes: selectedClasses });
    // Sıralama zaten bellekteki veri üzerinde ComparisonTable içinde client-side
    // yapılır — yeniden fetch yok (docs/06_SCREEN_CATALOG.md §4).
  }

  function handleClassesChange(nextClasses: string[]) {
    setSelectedClasses(nextClasses);
    updateUrl({ period, sortBy, sortDir, classes: nextClasses });
    // Sınıf bilgisi her satırda zaten mevcut (ComparisonRow.assetClass) —
    // yeniden fetch yerine bellekteki veri client-side filtrelenir, gereksiz
    // round-trip önlenir (docs/05_FRONTEND_SPEC.md §4 ilkesiyle tutarlı).
  }

  function handleRetry() {
    loadComparison({ period, sortBy, sortDir });
  }

  const visibleRows =
    selectedClasses.length === 0
      ? rows
      : rows.filter((row) => selectedClasses.includes(row.assetClass));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AssetClassFilter
          assetClasses={assetClasses}
          selected={selectedClasses}
          onChange={handleClassesChange}
        />
        <PeriodSelector value={period} onChange={handlePeriodChange} />
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Tekrar dene
          </Button>
        </div>
      )}

      <div className={isPending ? 'opacity-60 transition-opacity' : undefined}>
        <ComparisonTable
          rows={visibleRows}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={handleSortChange}
        />
      </div>
    </div>
  );
}

'use client';

import { useCallback, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AssetClassFilter } from '@/components/comparison/asset-class-filter';
import { AssetSelector, MAX_ASSETS, MIN_ASSETS } from '@/components/comparison/asset-selector';
import { ComparisonTable } from '@/components/comparison/comparison-table';
import { PeriodSelector } from '@/components/comparison/period-selector';
import { DataState, type DataStateStatus } from '@/components/ui/data-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ComparisonFetchError, fetchComparison } from '@/lib/fetchers/comparison-fetcher';
import { SeriesFetchError, fetchSeries } from '@/lib/fetchers/series-fetcher';
import type { AssetSeriesDto } from '@/lib/fetchers/series-fetcher';
import type {
  ComparisonPeriod,
  ComparisonResult,
  ComparisonRow,
  ComparisonSortBy,
  ComparisonSortDir,
} from '@/lib/services/comparison-service';
import type { AssetClassDto, AssetDto } from '@/lib/services/reference-data-service';

const GENERIC_ERROR_MESSAGE = 'Veriler yüklenirken bir sorun oluştu.';

// Recharts'ı statik import etmek ilk bundle'ı şişirir — `next/dynamic` ile
// `ssr: false`, yalnızca bu dosya çalıştığında (ve yalnızca bir kez) ayrı bir
// chunk olarak yüklenir (docs/05_FRONTEND_SPEC.md §9). `return-chart.tsx`
// dosyasını statik import eden başka hiçbir dosya olmamalı.
const ReturnChart = dynamic(
  () => import('@/components/comparison/return-chart').then((mod) => mod.ReturnChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> },
);

export interface ComparisonPanelProps {
  initialResult: ComparisonResult;
  initialPeriod: ComparisonPeriod;
  initialSortBy: ComparisonSortBy;
  initialSortDir: ComparisonSortDir;
  initialSelectedClasses: string[];
  assetClasses: AssetClassDto[];
  /** Grafik varlık seçici için aktif varlık listesi (`GET /api/assets`, docs/03 §5.1). */
  assets: AssetDto[];
  /** URL `assets` parametresinden çözülmüş, grafik için seçili semboller. */
  initialSelectedAssets: string[];
  /** `initialSelectedAssets` 2-5 arasıysa server component'te önceden çekilmiş seri verisi. */
  initialSeries: AssetSeriesDto[] | null;
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
  assets,
  initialSelectedAssets,
  initialSeries,
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

  const [selectedAssets, setSelectedAssets] = useState(initialSelectedAssets);
  const [seriesData, setSeriesData] = useState<AssetSeriesDto[] | null>(initialSeries);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [isSeriesPending, startSeriesTransition] = useTransition();

  const updateUrl = useCallback(
    (next: {
      period: ComparisonPeriod;
      sortBy: ComparisonSortBy;
      sortDir: ComparisonSortDir;
      classes: string[];
      assets: string[];
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
      if (next.assets.length > 0) {
        params.set('assets', next.assets.join(','));
      } else {
        params.delete('assets');
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

  // Yalnızca seçim 2-5 aralığındayken çağrılır — daha azında/fazlasında grafik
  // hiç render edilmez, gereksiz `INVALID_ASSET_SELECTION` isteği atılmaz
  // (docs/05_FRONTEND_SPEC.md §5, AssetSelector zaten bu kısıtı UI'da uygular).
  const loadSeries = useCallback((next: { period: ComparisonPeriod; symbols: string[] }) => {
    setSeriesError(null);
    startSeriesTransition(() => {
      fetchSeries(next)
        .then((result) => setSeriesData(result.series))
        .catch((fetchError: unknown) => {
          const message =
            fetchError instanceof SeriesFetchError ? fetchError.message : GENERIC_ERROR_MESSAGE;
          setSeriesError(message);
        });
    });
  }, []);

  function handlePeriodChange(nextPeriod: ComparisonPeriod) {
    setPeriod(nextPeriod);
    updateUrl({
      period: nextPeriod,
      sortBy,
      sortDir,
      classes: selectedClasses,
      assets: selectedAssets,
    });
    loadComparison({ period: nextPeriod, sortBy, sortDir });
    if (selectedAssets.length >= MIN_ASSETS) {
      loadSeries({ period: nextPeriod, symbols: selectedAssets });
    }
  }

  function handleSortChange(nextSortBy: ComparisonSortBy, nextSortDir: ComparisonSortDir) {
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
    updateUrl({
      period,
      sortBy: nextSortBy,
      sortDir: nextSortDir,
      classes: selectedClasses,
      assets: selectedAssets,
    });
    // Sıralama zaten bellekteki veri üzerinde ComparisonTable içinde client-side
    // yapılır — yeniden fetch yok (docs/06_SCREEN_CATALOG.md §4).
  }

  function handleClassesChange(nextClasses: string[]) {
    setSelectedClasses(nextClasses);
    updateUrl({ period, sortBy, sortDir, classes: nextClasses, assets: selectedAssets });
    // Sınıf bilgisi her satırda zaten mevcut (ComparisonRow.assetClass) —
    // yeniden fetch yerine bellekteki veri client-side filtrelenir, gereksiz
    // round-trip önlenir (docs/05_FRONTEND_SPEC.md §4 ilkesiyle tutarlı).
  }

  function handleAssetSelectionChange(nextAssets: string[]) {
    setSelectedAssets(nextAssets);
    updateUrl({ period, sortBy, sortDir, classes: selectedClasses, assets: nextAssets });
    if (nextAssets.length >= MIN_ASSETS && nextAssets.length <= MAX_ASSETS) {
      loadSeries({ period, symbols: nextAssets });
    } else {
      // Yetersiz seçim (0/1) — önceki grafik verisi/hatası temizlenir, grafik
      // gösterilmez (docs/06_SCREEN_CATALOG.md §4 "grafik boşsa gösterilmez").
      setSeriesData(null);
      setSeriesError(null);
    }
  }

  function handleRetry() {
    loadComparison({ period, sortBy, sortDir });
  }

  function handleSeriesRetry() {
    loadSeries({ period, symbols: selectedAssets });
  }

  const visibleRows =
    selectedClasses.length === 0
      ? rows
      : rows.filter((row) => selectedClasses.includes(row.assetClass));

  const hasEnoughAssetsForChart = selectedAssets.length >= MIN_ASSETS;

  // `DataState` (docs/06_SCREEN_CATALOG.md §6, docs/05_FRONTEND_SPEC.md §4) —
  // hata her zaman `loading`/`empty`'den önceliklidir (önceki veri banner
  // altında kalmaya devam eder), `empty` yalnızca hata yokken ve seçili
  // filtre kombinasyonu için hiç satır kalmadığında devreye girer.
  const tableStatus: DataStateStatus = error
    ? 'error'
    : isPending
      ? 'loading'
      : visibleRows.length === 0
        ? 'empty'
        : 'success';

  const chartStatus: DataStateStatus = seriesError
    ? 'error'
    : isSeriesPending || !seriesData
      ? 'loading'
      : 'success';

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

      <DataState status={tableStatus} error={error} onRetry={handleRetry}>
        <ComparisonTable
          rows={visibleRows}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={handleSortChange}
        />
      </DataState>

      <div className="space-y-3 border-t pt-6">
        <AssetSelector
          assets={assets}
          selected={selectedAssets}
          onChange={handleAssetSelectionChange}
        />

        {hasEnoughAssetsForChart && (
          <DataState status={chartStatus} error={seriesError} onRetry={handleSeriesRetry}>
            {seriesData ? (
              <ReturnChart series={seriesData} />
            ) : (
              <Skeleton className="h-72 w-full" />
            )}
          </DataState>
        )}
      </div>
    </div>
  );
}

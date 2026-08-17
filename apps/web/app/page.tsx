import { Suspense } from 'react';

import { InvalidAssetSelectionError } from '@terazi/core';

import type { AssetSeriesDto } from '@/lib/fetchers/series-fetcher';
import { getComparison } from '@/lib/services/comparison-service';
import type {
  ComparisonPeriod,
  ComparisonSortBy,
  ComparisonSortDir,
} from '@/lib/services/comparison-service';
import { getAssetClasses, getAssets } from '@/lib/services/reference-data-service';
import { getComparisonSeries } from '@/lib/services/series-service';

import { ComparisonPanel } from './comparison-panel';

// S-HOME (docs/06_SCREEN_CATALOG.md §4) — Server Component ilk yükleme: karşılaştırma
// verisi servis katmanından doğrudan çekilir, HTTP round-trip yok (docs/05_FRONTEND_SPEC.md
// §4). Filtre etkileşimi client component'e devredilir (./comparison-panel.tsx).

const VALID_PERIODS: readonly ComparisonPeriod[] = ['1m', '3m', '1y', '3y', '5y'];
const VALID_SORT_BY: readonly ComparisonSortBy[] = ['realReturn', 'nominalReturn', 'symbol'];
const VALID_SORT_DIR: readonly ComparisonSortDir[] = ['asc', 'desc'];

const DEFAULT_PERIOD: ComparisonPeriod = '1y';
const DEFAULT_SORT_BY: ComparisonSortBy = 'realReturn';
const DEFAULT_SORT_DIR: ComparisonSortDir = 'desc';

// Grafik varlık seçimi kısıtı (docs/06_SCREEN_CATALOG.md §4, docs/03_API_CONTRACTS.md §5.2).
const MIN_CHART_ASSETS = 2;
const MAX_CHART_ASSETS = 5;

type QueryValue = string | string[] | undefined;

function firstValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Geçersiz/eksik URL query değerleri sessizce varsayılana döner — ilk (SSR)
// yüklemede bu bir güvenlik ağıdır (docs/05_FRONTEND_SPEC.md §5), hata gösterilmez;
// elle URL manipülasyonu dışında normal kullanımda hiç tetiklenmez.
function parsePeriod(value: QueryValue): ComparisonPeriod {
  const raw = firstValue(value);
  return (VALID_PERIODS as readonly string[]).includes(raw ?? '')
    ? (raw as ComparisonPeriod)
    : DEFAULT_PERIOD;
}

function parseSortBy(value: QueryValue): ComparisonSortBy {
  const raw = firstValue(value);
  return (VALID_SORT_BY as readonly string[]).includes(raw ?? '')
    ? (raw as ComparisonSortBy)
    : DEFAULT_SORT_BY;
}

function parseSortDir(value: QueryValue): ComparisonSortDir {
  const raw = firstValue(value);
  return (VALID_SORT_DIR as readonly string[]).includes(raw ?? '')
    ? (raw as ComparisonSortDir)
    : DEFAULT_SORT_DIR;
}

function parseClasses(value: QueryValue): string[] {
  const raw = firstValue(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

/** `assets` — grafik için seçilen sembol listesi (docs/05_FRONTEND_SPEC.md §2). */
function parseAssets(value: QueryValue): string[] {
  const raw = firstValue(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol.length > 0);
}

interface HomePageProps {
  // Next.js 15: `searchParams` Server Component'lerde Promise olarak gelir.
  searchParams: Promise<Record<string, QueryValue>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  const period = parsePeriod(params.period);
  const sortBy = parseSortBy(params.sortBy);
  const sortDir = parseSortDir(params.sortDir);
  const selectedClasses = parseClasses(params.classes);
  const requestedAssets = parseAssets(params.assets);

  const [comparisonResult, assetClasses, assets] = await Promise.all([
    getComparison({ period, sortBy, sortDir }),
    getAssetClasses(),
    getAssets(),
  ]);

  // Grafik seçimi — 5'ten fazla sembol elle URL manipülasyonuyla gelirse sessizce
  // ilk 5'e kısaltılır (docs/05 §5 güvenlik ağı). 2-5 arası geçerli bir sayı varsa
  // grafik verisi de ilk yüklemede server-side çekilir (docs/05 §4 ilkesiyle
  // tutarlı — gereksiz bir client round-trip önlenir); backend `symbols`'ı
  // çözerken 2'den az geçerli varlığa düşerse (`InvalidAssetSelectionError`)
  // seçim sıfırlanır, sayfa çökmez.
  let selectedAssets =
    requestedAssets.length > MAX_CHART_ASSETS
      ? requestedAssets.slice(0, MAX_CHART_ASSETS)
      : requestedAssets;
  let initialSeries: AssetSeriesDto[] | null = null;

  if (selectedAssets.length >= MIN_CHART_ASSETS) {
    try {
      const seriesResult = await getComparisonSeries({ symbols: selectedAssets, period });
      initialSeries = seriesResult.series;
    } catch (error) {
      if (error instanceof InvalidAssetSelectionError) {
        selectedAssets = [];
      } else {
        throw error;
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Terazi</h1>
        <p className="text-sm text-muted-foreground">
          Döviz, gram altın, kripto ve yatırım fonlarının TL bazında reel getirisini karşılaştırın.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Yükleniyor…</p>}>
        <ComparisonPanel
          initialResult={comparisonResult}
          initialPeriod={period}
          initialSortBy={sortBy}
          initialSortDir={sortDir}
          initialSelectedClasses={selectedClasses}
          assetClasses={assetClasses}
          assets={assets}
          initialSelectedAssets={selectedAssets}
          initialSeries={initialSeries}
        />
      </Suspense>
    </div>
  );
}

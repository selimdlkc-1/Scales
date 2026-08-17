import { Suspense } from 'react';

import { getComparison } from '@/lib/services/comparison-service';
import type {
  ComparisonPeriod,
  ComparisonSortBy,
  ComparisonSortDir,
} from '@/lib/services/comparison-service';
import { getAssetClasses } from '@/lib/services/reference-data-service';

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

  const [comparisonResult, assetClasses] = await Promise.all([
    getComparison({ period, sortBy, sortDir }),
    getAssetClasses(),
  ]);

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
        />
      </Suspense>
    </div>
  );
}

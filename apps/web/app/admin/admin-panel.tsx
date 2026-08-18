'use client';

import { useCallback, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { JobRunTable } from '@/components/admin/job-run-table';
import { DataState, type DataStateStatus } from '@/components/ui/data-state';
import {
  AdminFetchError,
  fetchJobRuns,
  type AdminDataSource,
} from '@/lib/fetchers/admin-job-runs-fetcher';
import type { JobRunDto } from '@/lib/services/admin-service';
import { cn } from '@/lib/utils';

const GENERIC_ERROR_MESSAGE = 'Veriler yüklenirken bir sorun oluştu.';
const EMPTY_MESSAGE = 'Henüz çalıştırma kaydı yok.';

type SourceFilterValue = AdminDataSource | 'all';

const SOURCE_FILTER_OPTIONS: { value: SourceFilterValue; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'tcmb', label: 'TCMB' },
  { value: 'tefas', label: 'TEFAS' },
  { value: 'coingecko', label: 'CoinGecko' },
];

export interface AdminPanelProps {
  initialJobRuns: JobRunDto[];
  initialDataSource: SourceFilterValue;
}

/**
 * `S-OPERATOR-PANEL`'in interaktif kabuğu (docs/06_SCREEN_CATALOG.md §4) —
 * `app/admin/page.tsx` (Server Component) ilk job çalıştırma listesini buraya
 * devreder; `useSearchParams`/`useRouter` gibi client hook'ları gerektiren kaynak
 * filtresi etkileşimi bu yüzden `app/comparison-panel.tsx` ile aynı desende ayrı
 * bir client dosyada yaşar (docs/05_FRONTEND_SPEC.md §4). Kaynak sağlık kartları
 * burada değil, `app/admin/page.tsx`de render edilir — filtre değişiminde yeniden
 * çekilmezler (docs/06 §4 "Aksiyonlar": yalnızca tablo yeniden çekilir).
 */
export function AdminPanel({ initialJobRuns, initialDataSource }: AdminPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dataSource, setDataSource] = useState<SourceFilterValue>(initialDataSource);
  const [jobRuns, setJobRuns] = useState<JobRunDto[]>(initialJobRuns);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadJobRuns = useCallback((next: SourceFilterValue) => {
    setError(null);
    startTransition(() => {
      fetchJobRuns(next === 'all' ? {} : { dataSource: next })
        .then((result) => setJobRuns(result))
        .catch((fetchError: unknown) => {
          const message =
            fetchError instanceof AdminFetchError ? fetchError.message : GENERIC_ERROR_MESSAGE;
          setError(message);
        });
    });
  }, []);

  function handleDataSourceChange(next: SourceFilterValue) {
    setDataSource(next);

    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') {
      params.delete('dataSource');
    } else {
      params.set('dataSource', next);
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });

    loadJobRuns(next);
  }

  function handleRetry() {
    loadJobRuns(dataSource);
  }

  // `DataState` (docs/06_SCREEN_CATALOG.md §6, docs/05_FRONTEND_SPEC.md §4) —
  // hata her zaman `loading`/`empty`'den önceliklidir, `empty` yalnızca hata
  // yokken ve seçili kaynak için hiç çalıştırma kaydı kalmadığında devreye girer.
  const tableStatus: DataStateStatus = error
    ? 'error'
    : isPending
      ? 'loading'
      : jobRuns.length === 0
        ? 'empty'
        : 'success';

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Kaynak filtresi" className="inline-flex rounded-md border p-1">
        {SOURCE_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={dataSource === option.value}
            onClick={() => handleDataSourceChange(option.value)}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              dataSource === option.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <DataState
        status={tableStatus}
        error={error}
        onRetry={handleRetry}
        emptyMessage={EMPTY_MESSAGE}
      >
        <JobRunTable jobRuns={jobRuns} />
      </DataState>
    </div>
  );
}

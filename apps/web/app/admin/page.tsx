import { SourceHealthCard } from '@/components/admin/source-health-card';
import type { AdminDataSource } from '@/lib/fetchers/admin-job-runs-fetcher';
import { getJobRuns, getSourceHealth } from '@/lib/services/admin-service';

import { AdminPanel } from './admin-panel';

// S-OPERATOR-PANEL (docs/06_SCREEN_CATALOG.md §4) — Server Component ilk yükleme:
// job geçmişi + kaynak sağlığı `admin-service`den doğrudan çekilir, HTTP round-trip
// yok (docs/05_FRONTEND_SPEC.md §4, `app/page.tsx` ile aynı desen). Kaynak filtresi
// etkileşimi client component'e devredilir (./admin-panel.tsx). Bu sayfa yalnızca
// `apps/web/middleware.ts`'in `Authorization: Basic` doğrulamasından geçen istekler
// için render edilir (docs/05 §2) — burada ayrıca bir auth kontrolü yapılmaz.

const VALID_SOURCES: readonly AdminDataSource[] = ['tcmb', 'tefas', 'coingecko'];
const DEFAULT_JOB_RUNS_LIMIT = 50;

type SourceFilterValue = AdminDataSource | 'all';
type QueryValue = string | string[] | undefined;

function firstValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Geçersiz/eksik `dataSource` sessizce "Tümü"ye döner (docs/05_FRONTEND_SPEC.md §5
// güvenlik ağıyla aynı ilke) — elle URL manipülasyonu dışında normal kullanımda hiç
// tetiklenmez.
function parseDataSource(value: QueryValue): SourceFilterValue {
  const raw = firstValue(value);
  return (VALID_SOURCES as readonly string[]).includes(raw ?? '')
    ? (raw as AdminDataSource)
    : 'all';
}

interface AdminPageProps {
  // Next.js 15: `searchParams` Server Component'lerde Promise olarak gelir.
  searchParams: Promise<Record<string, QueryValue>>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const dataSource = parseDataSource(params.dataSource);

  const [jobRuns, sources] = await Promise.all([
    getJobRuns({
      dataSource: dataSource === 'all' ? undefined : dataSource,
      limit: DEFAULT_JOB_RUNS_LIMIT,
    }),
    getSourceHealth(),
  ]);

  return (
    <div className="space-y-8">
      <section aria-label="Kaynak sağlık durumu" className="grid gap-4 sm:grid-cols-3">
        {sources.map((source) => (
          <SourceHealthCard key={source.dataSource} source={source} />
        ))}
      </section>

      <section aria-label="Job çalıştırma geçmişi">
        <AdminPanel initialJobRuns={jobRuns} initialDataSource={dataSource} />
      </section>
    </div>
  );
}

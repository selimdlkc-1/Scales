import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format';
import type { SourceHealthDto } from '@/lib/services/admin-service';
import { cn } from '@/lib/utils';

const SOURCE_LABELS: Record<string, string> = {
  tcmb: 'TCMB',
  tefas: 'TEFAS',
  coingecko: 'CoinGecko',
};

const STALE_WARNING_MESSAGE = 'Beklenen güncelleme takviminden gecikmiş.';

export interface SourceHealthCardProps {
  source: SourceHealthDto;
}

/**
 * Tek bir kaynağın sağlık kartı (docs/06_SCREEN_CATALOG.md §4) — `S-OPERATOR-PANEL`
 * her zaman 3 kartı (TCMB/TEFAS/CoinGecko) birlikte gösterir; bu bileşen tekil bir
 * kartın render'ından sorumludur, üst seviye (`app/admin/page.tsx`) 3 kez map eder.
 *
 * Composite bileşen: yalnızca props alır, kendi içinde fetch yapmaz
 * (.claude/rules/24-frontend-components.md) — kaynak sağlığı `S-OPERATOR-PANEL`de
 * filtre değişiminde yeniden çekilmez (yalnızca job çalıştırma tablosu çekilir,
 * docs/06 §4 "Aksiyonlar"), bu yüzden fetch orkestrasyonuna hiç ihtiyaç duymaz ve
 * `'use client'` işareti taşımaz.
 */
export function SourceHealthCard({ source }: SourceHealthCardProps) {
  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border p-4',
        // `isStale=true` → turuncu kenarlık vurgusu (docs/06 §4).
        source.isStale ? 'border-orange-400' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">
          {SOURCE_LABELS[source.dataSource] ?? source.dataSource}
        </h3>
        {source.lastRunStatus && <StatusBadge status={source.lastRunStatus} />}
      </div>

      <p className="text-xs text-muted-foreground">
        Son başarılı çalışma: {formatDateTime(source.lastSuccessAt)}
      </p>

      {source.isStale && (
        <p role="alert" className="text-xs font-medium text-orange-700">
          {STALE_WARNING_MESSAGE}
        </p>
      )}
    </div>
  );
}

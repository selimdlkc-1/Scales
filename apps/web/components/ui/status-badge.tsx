import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** `job_runs.status` CHECK constraint değerleri (docs/02_DATABASE_SCHEMA.md §2.5). */
export type JobRunStatus = 'pending' | 'running' | 'success' | 'partial' | 'failed';

const STATUS_LABELS: Record<JobRunStatus, string> = {
  pending: 'Bekliyor',
  running: 'Çalışıyor',
  success: 'Başarılı',
  partial: 'Kısmi Başarı',
  failed: 'Hata',
};

// Renk tek başına anlam taşımaz kuralı (docs/05_FRONTEND_SPEC.md §8) — metin
// etiketi (STATUS_LABELS) her zaman gösterilir, renk yalnızca destekleyicidir.
const STATUS_CLASSES: Record<JobRunStatus, string> = {
  pending: 'border-transparent bg-muted text-muted-foreground',
  running: 'border-transparent bg-blue-100 text-blue-800',
  success: 'border-transparent bg-green-100 text-green-800',
  partial: 'border-transparent bg-orange-100 text-orange-800',
  failed: 'border-transparent bg-destructive text-destructive-foreground',
};

function isJobRunStatus(value: string): value is JobRunStatus {
  return value in STATUS_LABELS;
}

export interface StatusBadgeProps {
  status: string;
}

/**
 * Job durum rozeti — `S-OPERATOR-PANEL` (docs/06_SCREEN_CATALOG.md §4, §6) ve
 * S-HOME'daki tablo satırı `status`u için ortak bileşen. `status` veritabanından
 * ham `string` olarak gelir (Prisma `@db.VarChar`, enum değil) — bilinmeyen bir
 * değer gelirse (beklenmez ama şema bunu garanti etmez) component çökmemesi için
 * ham string olduğu gibi, renksiz gösterilir.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  if (!isJobRunStatus(status)) {
    return <Badge variant="outline">{status}</Badge>;
  }

  return <Badge className={cn(STATUS_CLASSES[status])}>{STATUS_LABELS[status]}</Badge>;
}

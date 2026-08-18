import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import type { JobRunDto } from '@/lib/services/admin-service';

const SOURCE_LABELS: Record<string, string> = {
  tcmb: 'TCMB',
  tefas: 'TEFAS',
  coingecko: 'CoinGecko',
};

export interface JobRunTableProps {
  /** En yeni çalıştırma en üstte — sıralama servis katmanında yapılır (docs/03_API_CONTRACTS.md §5.3), burada tekrar sıralanmaz (ekranda bir sıralama etkileşimi yok). */
  jobRuns: JobRunDto[];
}

/**
 * Job çalıştırma geçmişi tablosu (docs/06_SCREEN_CATALOG.md §4) — kaynak,
 * durum, başlangıç/bitiş zamanı, işlenen kayıt sayısı, hata mesajı kolonları.
 *
 * Composite bileşen: yalnızca props alır, kendi içinde fetch yapmaz
 * (.claude/rules/24-frontend-components.md); boş/hata/yükleniyor durumları
 * üst seviyenin (`app/admin/admin-panel.tsx`) `DataState` wrapper'ı tarafından
 * ele alınır — bu bileşen yalnızca `success` durumunda mount edilir.
 */
export function JobRunTable({ jobRuns }: JobRunTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kaynak</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead>Başlangıç</TableHead>
          <TableHead>Bitiş</TableHead>
          <TableHead>Kayıt Sayısı</TableHead>
          <TableHead>Hata Mesajı</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobRuns.map((jobRun) => (
          <TableRow key={jobRun.id}>
            <TableCell>{SOURCE_LABELS[jobRun.dataSource] ?? jobRun.dataSource}</TableCell>
            <TableCell>
              <StatusBadge status={jobRun.status} />
            </TableCell>
            <TableCell>{formatDateTime(jobRun.startedAt)}</TableCell>
            <TableCell>{formatDateTime(jobRun.finishedAt)}</TableCell>
            <TableCell className="tabular-nums">{jobRun.recordsUpserted}</TableCell>
            <TableCell className="text-muted-foreground">{jobRun.errorMessage ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

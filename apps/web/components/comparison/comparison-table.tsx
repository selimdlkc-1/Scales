'use client';

import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatPercent } from '@/lib/format';
import type {
  ComparisonRow,
  ComparisonSortBy,
  ComparisonSortDir,
} from '@/lib/services/comparison-service';
import { cn } from '@/lib/utils';

const ASSET_CLASS_LABELS: Record<string, string> = {
  fx: 'Döviz',
  gold: 'Altın',
  crypto: 'Kripto Para',
  fund: 'Yatırım Fonu',
};

// `sortBy` (docs/03_API_CONTRACTS.md §5.2 enum'u) ↔ TanStack column id eşlemesi.
const SORTABLE_COLUMN_IDS: Record<ComparisonSortBy, string> = {
  symbol: 'symbol',
  nominalReturn: 'nominalReturn',
  realReturn: 'realReturn',
};

/** Ondalık oran string'lerini (`"0.083047"`) sayısal olarak karşılaştırır — string sıralaması yanlış sonuç verir. */
function compareReturnStrings(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return Number(a) - Number(b);
}

function ReturnCell({ value }: { value: string | null }) {
  const isNegative = value !== null && value.startsWith('-');
  return (
    <span
      className={cn(
        'font-medium tabular-nums',
        value !== null && (isNegative ? 'text-red-600' : 'text-green-700'),
      )}
    >
      {formatPercent(value)}
    </span>
  );
}

const columnHelper = createColumnHelper<ComparisonRow>();

const columns = [
  columnHelper.accessor('symbol', {
    header: 'Sembol',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('assetClass', {
    header: 'Varlık Sınıfı',
    enableSorting: false,
    cell: (info) => ASSET_CLASS_LABELS[info.getValue()] ?? info.getValue(),
  }),
  columnHelper.accessor('nominalReturn', {
    header: 'Nominal Getiri',
    sortingFn: (rowA, rowB, columnId) =>
      compareReturnStrings(rowA.getValue(columnId), rowB.getValue(columnId)),
    cell: (info) => <ReturnCell value={info.getValue()} />,
  }),
  columnHelper.accessor('realReturn', {
    header: 'Reel Getiri',
    sortingFn: (rowA, rowB, columnId) =>
      compareReturnStrings(rowA.getValue(columnId), rowB.getValue(columnId)),
    cell: (info) => <ReturnCell value={info.getValue()} />,
  }),
  columnHelper.accessor('asOfDate', {
    header: 'Veri Tarihi',
    enableSorting: false,
    cell: (info) => formatDate(info.getValue()),
  }),
];

export interface ComparisonTableProps {
  /** Sınıf filtresi zaten uygulanmış satırlar (üst seviyenin sorumluluğu). */
  rows: ComparisonRow[];
  sortBy: ComparisonSortBy;
  sortDir: ComparisonSortDir;
  onSortChange: (sortBy: ComparisonSortBy, sortDir: ComparisonSortDir) => void;
}

/**
 * Karşılaştırma tablosu — TanStack Table. Kolon başlığına tıklama yalnızca
 * client-side yeniden sıralama tetikler, ek API çağrısı yapılmaz
 * (docs/06_SCREEN_CATALOG.md §4). `status="unavailable"` satırlar TanStack'in
 * sıralama modelinin tamamen dışında tutulur ve yön fark etmeksizin her zaman
 * en altta, gri + "Veri yok" etiketiyle render edilir.
 *
 * Composite bileşen: yalnızca props alır, kendi içinde fetch yapmaz
 * (.claude/rules/24-frontend-components.md) — sıralama state'i URL ile
 * senkron tutulması üst seviyenin (app/comparison-panel.tsx) sorumluluğudur.
 */
export function ComparisonTable({ rows, sortBy, sortDir, onSortChange }: ComparisonTableProps) {
  // `useMemo` ZORUNLU — Faz 4 §4.5 Playwright smoke e2e'siyle keşfedilen gerçek
  // bug: `rows.filter(...)`'ın her render'da ürettiği YENİ (referansça kararsız)
  // array, `useReactTable`'ın `data` girdisine geçildiğinde ve sonuç 0 eleman
  // (tüm satırlar `status='unavailable'`, ör. worker henüz hiç çalışmamışsa)
  // olduğunda `@tanstack/react-table` v8.21.3 + React 19'da sonsuz render
  // döngüsüne giriyor (TanStack/table#6002 ile aynı sınıf — "empty data array
  // without a stable reference"), tarayıcı sekmesini tamamen kilitliyor. `rows`
  // değişmediği sürece aynı referansı koruyarak bu döngü engellenir.
  const availableRows = useMemo(() => rows.filter((row) => row.status === 'ok'), [rows]);
  const unavailableRows = useMemo(() => rows.filter((row) => row.status === 'unavailable'), [rows]);

  const sorting: SortingState = useMemo(
    () => [{ id: SORTABLE_COLUMN_IDS[sortBy], desc: sortDir === 'desc' }],
    [sortBy, sortDir],
  );

  const table = useReactTable({
    data: availableRows,
    columns,
    state: { sorting },
    // Her zaman tam olarak bir sıralanan kolon olsun — "sıralama yok" ara
    // durumuna izin verilmez (backend `sortBy`/`sortDir` enum'u da varsayılan
    // zorunlu, docs/03 §5.2).
    enableSortingRemoval: false,
    enableMultiSort: false,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const nextSort = next[0];
      if (!nextSort) return;
      const nextSortBy = (Object.keys(SORTABLE_COLUMN_IDS) as ComparisonSortBy[]).find(
        (key) => SORTABLE_COLUMN_IDS[key] === nextSort.id,
      );
      if (!nextSortBy) return;
      onSortChange(nextSortBy, nextSort.desc ? 'desc' : 'asc');
    },
    getRowId: (row) => row.symbol,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Bu dönem için veri bulunamadı.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.column.getCanSort() ? (
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className="flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <SortIndicator direction={header.column.getIsSorted()} />
                  </button>
                ) : (
                  flexRender(header.column.columnDef.header, header.getContext())
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {unavailableRows.map((row) => (
          <TableRow key={row.symbol} className="text-muted-foreground opacity-60">
            <TableCell>{row.symbol}</TableCell>
            <TableCell>{ASSET_CLASS_LABELS[row.assetClass] ?? row.assetClass}</TableCell>
            <TableCell colSpan={3}>Veri yok</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SortIndicator({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (!direction) return null;
  return (
    <span aria-hidden="true" className="text-xs">
      {direction === 'asc' ? '▲' : '▼'}
    </span>
  );
}

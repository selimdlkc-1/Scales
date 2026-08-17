'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { AssetSeriesDto } from '@/lib/fetchers/series-fetcher';

// Kategorik palet (dataviz skill referans paleti, light-only — proje karanlık mod
// içermiyor, docs/05_FRONTEND_SPEC.md §7). Sabit sırayla, varlığın seçim sırasına
// göre atanır — renk asla değere/sıralamaya göre yeniden atanmaz (bir varlık aynı
// rengi korur, listeden çıkarılıp eklenmedikçe).
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];

const SURFACE_COLOR = '#ffffff'; // app/globals.css --background
const GRIDLINE_COLOR = '#e1e0d9';
const AXIS_COLOR = '#c3c2b7';
const MUTED_TEXT_COLOR = '#898781';

export interface ReturnChartProps {
  series: AssetSeriesDto[];
}

interface ChartRow {
  date: string;
  [symbol: string]: string | number | null;
}

/**
 * `AssetSeriesDto.points` her seri için aynı `sampleDates` uzunluğundan üretilir
 * (`lib/services/series-service.ts` `buildSampleDates`) — bu yüzden index bazlı
 * birleştirme güvenlidir, ayrı bir tarih-eşleme adımı gerekmez.
 */
function buildChartData(series: AssetSeriesDto[]): ChartRow[] {
  const pointCount = series[0]?.points.length ?? 0;

  return Array.from({ length: pointCount }, (_, index) => {
    const row: ChartRow = { date: series[0]?.points[index]?.date ?? '' };
    for (const assetSeries of series) {
      const point = assetSeries.points[index];
      row[assetSeries.symbol] =
        point?.value === null || point?.value === undefined ? null : Number(point.value);
    }
    return row;
  });
}

function formatAxisDate(value: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit' }).format(
    new Date(value),
  );
}

function formatTooltipDate(value: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
}

function formatIndexValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number(value));
}

/**
 * Normalize edilmiş (100 bazlı) getiri grafiği — Recharts `LineChart`
 * (docs/06_SCREEN_CATALOG.md §4, docs/03_API_CONTRACTS.md §5.2). Bu dosya yalnızca
 * `next/dynamic(() => import(...), { ssr: false })` üzerinden dinamik olarak
 * yüklenir (`app/comparison-panel.tsx`) — Recharts'ı statik import eden başka bir
 * dosya yoktur, ilk bundle'a girmez (docs/05_FRONTEND_SPEC.md §9).
 *
 * Grafik verisi aynı zamanda `ComparisonTable`'da metinsel olarak da mevcuttur;
 * bu grafik salt görsel bir tekrar sunumudur (docs/05 §8) — bu yüzden Recharts'ın
 * ürettiği SVG `aria-hidden` ile işaretlenir, dış sarmalayıcı `role="img"` +
 * `aria-label` taşır.
 */
export function ReturnChart({ series }: ReturnChartProps) {
  const data = buildChartData(series);

  return (
    <div
      role="img"
      aria-label="Seçilen varlıkların normalize edilmiş getiri grafiği"
      className="h-72 w-full"
    >
      <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRIDLINE_COLOR} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fill: MUTED_TEXT_COLOR, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: AXIS_COLOR }}
          />
          <YAxis
            tick={{ fill: MUTED_TEXT_COLOR, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            labelFormatter={(value: string | number) => formatTooltipDate(String(value))}
            formatter={(value: unknown) => formatIndexValue(value)}
            contentStyle={{ borderRadius: 6, borderColor: AXIS_COLOR, fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 13, color: MUTED_TEXT_COLOR }} iconType="line" />
          {series.map((assetSeries, index) => (
            <Line
              key={assetSeries.symbol}
              type="monotone"
              dataKey={assetSeries.symbol}
              name={assetSeries.symbol}
              stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE_COLOR }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

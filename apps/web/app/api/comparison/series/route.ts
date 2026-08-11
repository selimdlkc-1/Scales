import { InvalidAssetSelectionError, seriesQuerySchema } from '@terazi/core';
import { NextResponse, type NextRequest } from 'next/server';

import { getComparisonSeries } from '../../../../lib/services/series-service.js';

// Route handler (controller katmanı) — query doğrulama (Zod) + servis çağrısı +
// yanıt biçimlendirme, iş kuralı içermez (.claude/rules/10-backend-architecture.md).
//
// Bu iterasyonda merkezi `withValidation`/`withErrorHandling` middleware'i
// henüz yok (İterasyon 5'te çıkarılır) — doğrulama/hata çevrimi burada
// `/api/comparison` (İterasyon 2) ile aynı geçici desende inline yapılır
// (docs/10_IMPLEMENTATION_ROADMAP.md §3.3).

/** `meta.requestId` — log korelasyonu için rastgele kısa kimlik (docs/03_API_CONTRACTS.md §2). */
function generateRequestId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

/** Kaynak: docs/03_API_CONTRACTS.md §5.2 — `/api/comparison` ile aynı cache politikası. */
const CACHE_CONTROL_DEFAULT = 'public, max-age=3600, stale-while-revalidate=86400';
/** En az bir `crypto` varlığı içeren yanıt için kısa cache (docs/03 §5.2). */
const CACHE_CONTROL_CRYPTO = 'public, max-age=300, stale-while-revalidate=3600';

type RawQuery = Record<'assets' | 'period', string | undefined>;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const generatedAt = new Date().toISOString();

  const searchParams = request.nextUrl.searchParams;
  const raw: RawQuery = {
    assets: searchParams.get('assets') ?? undefined,
    period: searchParams.get('period') ?? undefined,
  };

  const parsed = seriesQuerySchema.safeParse(raw);

  if (!parsed.success) {
    // `period` eksik/enum dışıysa ayrı bir error code'a çevrilir
    // (docs/03_API_CONTRACTS.md §3 `INVALID_PERIOD` — `/api/comparison` ile
    // aynı desen).
    const periodIssue = parsed.error.issues.find((issue) => issue.path[0] === 'period');

    if (periodIssue) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PERIOD',
            message: 'Geçersiz dönem değeri.',
            details: { field: 'period', received: raw.period ?? null },
          },
          meta: { requestId, generatedAt },
        },
        { status: 400 },
      );
    }

    const firstIssue = parsed.error.issues[0];
    const field = firstIssue ? String(firstIssue.path[0]) : 'unknown';

    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Geçersiz sorgu parametresi.',
          details: { field, received: raw[field as keyof RawQuery] ?? null },
        },
        meta: { requestId, generatedAt },
      },
      { status: 400 },
    );
  }

  const symbols = parsed.data.assets
    .split(',')
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol.length > 0);

  try {
    const result = await getComparisonSeries({ symbols, period: parsed.data.period });

    const cacheControl = result.hasCryptoAsset ? CACHE_CONTROL_CRYPTO : CACHE_CONTROL_DEFAULT;

    return NextResponse.json(
      {
        data: { period: result.period, series: result.series },
        meta: { requestId, generatedAt },
      },
      { headers: { 'Cache-Control': cacheControl } },
    );
  } catch (error) {
    if (error instanceof InvalidAssetSelectionError) {
      return NextResponse.json(
        {
          error: { code: error.code, message: error.message, details: error.details },
          meta: { requestId, generatedAt },
        },
        { status: error.httpStatus },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Beklenmeyen bir hata oluştu.',
        },
        meta: { requestId, generatedAt },
      },
      { status: 500 },
    );
  }
}

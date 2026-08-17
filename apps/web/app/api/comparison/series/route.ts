import { seriesQuerySchema, type SeriesQuery } from '@terazi/core';
import { NextResponse, type NextRequest } from 'next/server';

import { buildMeta } from '../../../../lib/middleware/response-envelope.js';
import { withErrorHandling } from '../../../../lib/middleware/with-error-handling.js';
import { withRateLimit } from '../../../../lib/middleware/with-rate-limit.js';
import { withValidation } from '../../../../lib/middleware/with-validation.js';
import { getComparisonSeries } from '../../../../lib/services/series-service.js';

// Route handler (controller katmanı) — query doğrulama (Zod) + servis çağrısı +
// yanıt biçimlendirme, iş kuralı içermez (.claude/rules/10-backend-architecture.md).
//
// Doğrulama/rate limit/hata çevrimi artık merkezi middleware zincirinde
// (docs/04_BACKEND_SPEC.md §4, docs/10_IMPLEMENTATION_ROADMAP.md §3.5). Servis
// katmanının fırlattığı `InvalidAssetSelectionError` artık burada
// `instanceof` ile yakalanmaz — `withErrorHandling` `TeraziError` taban
// sınıfı üzerinden merkezi olarak çevirir.

/** Kaynak: docs/03_API_CONTRACTS.md §5.2 — `/api/comparison` ile aynı cache politikası. */
const CACHE_CONTROL_DEFAULT = 'public, max-age=3600, stale-while-revalidate=86400';
/** En az bir `crypto` varlığı içeren yanıt için kısa cache (docs/03 §5.2). */
const CACHE_CONTROL_CRYPTO = 'public, max-age=300, stale-while-revalidate=3600';

async function handler(_request: NextRequest, query: SeriesQuery): Promise<NextResponse> {
  const symbols = query.assets
    .split(',')
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol.length > 0);

  const result = await getComparisonSeries({ symbols, period: query.period });

  const cacheControl = result.hasCryptoAsset ? CACHE_CONTROL_CRYPTO : CACHE_CONTROL_DEFAULT;

  return NextResponse.json(
    { data: { period: result.period, series: result.series }, meta: buildMeta() },
    { headers: { 'Cache-Control': cacheControl } },
  );
}

export const GET = withErrorHandling(withRateLimit(withValidation(seriesQuerySchema, handler)));

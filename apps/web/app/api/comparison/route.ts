import { comparisonQuerySchema, type ComparisonQuery } from '@terazi/core';
import { NextResponse, type NextRequest } from 'next/server';

import { buildMeta } from '../../../lib/middleware/response-envelope.js';
import { withErrorHandling } from '../../../lib/middleware/with-error-handling.js';
import { withRateLimit } from '../../../lib/middleware/with-rate-limit.js';
import { withValidation } from '../../../lib/middleware/with-validation.js';
import { getComparison } from '../../../lib/services/comparison-service.js';

// Route handler (controller katmanı) — query doğrulama (Zod) + servis çağrısı +
// yanıt biçimlendirme, iş kuralı içermez (.claude/rules/10-backend-architecture.md).
//
// Doğrulama/rate limit/hata çevrimi artık merkezi middleware zincirinde
// (docs/04_BACKEND_SPEC.md §4, docs/10_IMPLEMENTATION_ROADMAP.md §3.5) — bu
// route kendi ad-hoc `try/catch`/parse kodunu taşımaz. `INVALID_PERIOD`
// çevrimi `withValidation` içinde merkezi olarak korunur.

/** Kaynak: docs/03_API_CONTRACTS.md §5.2 — döviz/altın/fon ağırlıklı yanıt. */
const CACHE_CONTROL_DEFAULT = 'public, max-age=3600, stale-while-revalidate=86400';
/** En az bir `crypto` varlığı içeren yanıt için kısa cache (docs/03 §5.2). */
const CACHE_CONTROL_CRYPTO = 'public, max-age=300, stale-while-revalidate=3600';

async function handler(_request: NextRequest, query: ComparisonQuery): Promise<NextResponse> {
  const symbols = query.assets
    ?.split(',')
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol.length > 0);

  const data = await getComparison({
    symbols,
    period: query.period,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });

  const cacheControl = data.rows.some((row) => row.assetClass === 'crypto')
    ? CACHE_CONTROL_CRYPTO
    : CACHE_CONTROL_DEFAULT;

  return NextResponse.json(
    { data, meta: buildMeta() },
    { headers: { 'Cache-Control': cacheControl } },
  );
}

export const GET = withErrorHandling(withRateLimit(withValidation(comparisonQuerySchema, handler)));

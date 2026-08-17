import { assetsQuerySchema, type AssetsQuery } from '@terazi/core';
import { NextResponse, type NextRequest } from 'next/server';

import { buildMeta } from '../../../lib/middleware/response-envelope.js';
import { withErrorHandling } from '../../../lib/middleware/with-error-handling.js';
import { withRateLimit } from '../../../lib/middleware/with-rate-limit.js';
import { withValidation } from '../../../lib/middleware/with-validation.js';
import { getAssets } from '../../../lib/services/reference-data-service.js';

// Route handler (controller katmanı) — query doğrulama (Zod) + servis çağrısı +
// yanıt biçimlendirme, iş kuralı içermez (.claude/rules/10-backend-architecture.md).
//
// Doğrulama/rate limit/hata çevrimi artık merkezi middleware zincirinde
// (docs/04_BACKEND_SPEC.md §4, docs/10_IMPLEMENTATION_ROADMAP.md §3.5) — bu
// route kendi ad-hoc `try/catch`/parse kodunu taşımaz.

/** Kaynak: docs/03_API_CONTRACTS.md §5.1. */
const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

async function handler(_request: NextRequest, query: AssetsQuery): Promise<NextResponse> {
  const data = await getAssets({ assetClass: query.assetClass });

  return NextResponse.json(
    { data, meta: buildMeta() },
    { headers: { 'Cache-Control': CACHE_CONTROL } },
  );
}

export const GET = withErrorHandling(withRateLimit(withValidation(assetsQuerySchema, handler)));

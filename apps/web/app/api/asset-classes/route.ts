import { NextResponse, type NextRequest } from 'next/server';

import { withErrorHandling } from '../../../lib/middleware/with-error-handling.js';
import { withRateLimit } from '../../../lib/middleware/with-rate-limit.js';
import { buildMeta } from '../../../lib/middleware/response-envelope.js';
import { getAssetClasses } from '../../../lib/services/reference-data-service.js';

// Route handler (controller katmanı) — yalnızca servis çağrısı + yanıt
// biçimlendirme, iş kuralı içermez (.claude/rules/10-backend-architecture.md).
//
// Query parametresi yok → `withValidation` zincire eklenmez. Hata çevrimi ve
// rate limit merkezi middleware'e devredildi (docs/10_IMPLEMENTATION_ROADMAP.md
// §3.5) — bu route artık kendi `try/catch`'ini taşımaz.

/** Kaynak: docs/03_API_CONTRACTS.md §5.1 — bu veri pratikte hiç değişmez. */
const CACHE_CONTROL = 'public, max-age=86400';

async function handler(_request: NextRequest): Promise<NextResponse> {
  const data = await getAssetClasses();

  return NextResponse.json(
    { data, meta: buildMeta() },
    { headers: { 'Cache-Control': CACHE_CONTROL } },
  );
}

export const GET = withErrorHandling(withRateLimit(handler));

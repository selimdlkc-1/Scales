import { NextResponse, type NextRequest } from 'next/server';

import { buildMeta } from '../../../../lib/middleware/response-envelope.js';
import { withAdminAuth } from '../../../../lib/middleware/with-admin-auth.js';
import { withErrorHandling } from '../../../../lib/middleware/with-error-handling.js';
import { withRateLimit } from '../../../../lib/middleware/with-rate-limit.js';
import { getSourceHealth } from '../../../../lib/services/admin-service.js';

// Route handler (controller katmanı) — yalnızca servis çağrısı + yanıt
// biçimlendirme, iş kuralı içermez (.claude/rules/10-backend-architecture.md).
//
// Query parametresi yok → `withValidation` zincire eklenmez (`app/api/asset-classes/route.ts`
// ile aynı desen). Middleware zinciri docs/04_BACKEND_SPEC.md §4 sırasıyla:
// withErrorHandling(withRateLimit(withAdminAuth(handler))).

/** Kaynak: docs/03_API_CONTRACTS.md §5.3 — operatör her zaman en güncel durumu görmeli. */
const CACHE_CONTROL = 'no-store';

async function handler(_request: NextRequest): Promise<NextResponse> {
  const data = await getSourceHealth();

  return NextResponse.json(
    { data, meta: buildMeta() },
    { headers: { 'Cache-Control': CACHE_CONTROL } },
  );
}

export const GET = withErrorHandling(withRateLimit(withAdminAuth(handler)));

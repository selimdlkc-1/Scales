import { adminJobRunsQuerySchema, type AdminJobRunsQuery } from '@terazi/core';
import { NextResponse, type NextRequest } from 'next/server';

import { buildMeta } from '../../../../lib/middleware/response-envelope.js';
import { withAdminAuth } from '../../../../lib/middleware/with-admin-auth.js';
import { withErrorHandling } from '../../../../lib/middleware/with-error-handling.js';
import { withRateLimit } from '../../../../lib/middleware/with-rate-limit.js';
import { withValidation } from '../../../../lib/middleware/with-validation.js';
import { getJobRuns } from '../../../../lib/services/admin-service.js';

// Route handler (controller katmanı) — query doğrulama (Zod) + servis çağrısı +
// yanıt biçimlendirme, iş kuralı içermez (.claude/rules/10-backend-architecture.md).
//
// Middleware zinciri docs/04_BACKEND_SPEC.md §4 madde 4 sırasıyla kurulur:
// withErrorHandling(withRateLimit(withValidation(schema, withAdminAuth(handler)))) —
// `withAdminAuth` en içte, `withValidation`'dan SONRA çalışır (query doğrulaması
// auth'tan önce kısa devre yapabilir; bu proje ölçeğinde ayrı bir güvenlik
// riski oluşturmaz çünkü `VALIDATION_ERROR` yanıtı hiçbir gizli veri sızdırmaz).

/** Kaynak: docs/03_API_CONTRACTS.md §5.3 — operatör her zaman en güncel durumu görmeli. */
const CACHE_CONTROL = 'no-store';

async function handler(_request: NextRequest, query: AdminJobRunsQuery): Promise<NextResponse> {
  const data = await getJobRuns({ dataSource: query.dataSource, limit: query.limit });

  return NextResponse.json(
    { data, meta: buildMeta() },
    { headers: { 'Cache-Control': CACHE_CONTROL } },
  );
}

export const GET = withErrorHandling(
  withRateLimit(withValidation(adminJobRunsQuerySchema, withAdminAuth(handler))),
);

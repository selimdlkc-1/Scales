import { assetsQuerySchema } from '@terazi/core';
import { NextResponse, type NextRequest } from 'next/server';

import { getAssets } from '../../../lib/services/reference-data-service.js';

// Route handler (controller katmanı) — query doğrulama (Zod) + servis çağrısı +
// yanıt biçimlendirme, iş kuralı içermez (.claude/rules/10-backend-architecture.md).
//
// Bu iterasyonda merkezi `withValidation`/`withErrorHandling` middleware'i henüz
// yok (İterasyon 5'te çıkarılır) — doğrulama/hata çevrimi burada geçici olarak
// inline yapılır (docs/10_IMPLEMENTATION_ROADMAP.md §3.1).

/** `meta.requestId` — log korelasyonu için rastgele kısa kimlik (docs/03_API_CONTRACTS.md §2). */
function generateRequestId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

/** Kaynak: docs/03_API_CONTRACTS.md §5.1. */
const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const generatedAt = new Date().toISOString();

  const rawAssetClass = request.nextUrl.searchParams.get('assetClass');
  const parsed = assetsQuerySchema.safeParse(
    rawAssetClass === null ? {} : { assetClass: rawAssetClass },
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Geçersiz sorgu parametresi.',
          details: { field: 'assetClass', received: rawAssetClass },
        },
        meta: { requestId, generatedAt },
      },
      { status: 400 },
    );
  }

  try {
    const data = await getAssets({ assetClass: parsed.data.assetClass });

    return NextResponse.json(
      { data, meta: { requestId, generatedAt } },
      { headers: { 'Cache-Control': CACHE_CONTROL } },
    );
  } catch {
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

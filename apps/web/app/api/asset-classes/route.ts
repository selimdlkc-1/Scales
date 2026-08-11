import { NextResponse } from 'next/server';

import { getAssetClasses } from '../../../lib/services/reference-data-service.js';

// Route handler (controller katmanı) — yalnızca servis çağrısı + yanıt biçimlendirme,
// iş kuralı içermez (.claude/rules/10-backend-architecture.md).
//
// Bu iterasyonda merkezi `withErrorHandling` middleware'i henüz yok (İterasyon 5'te
// çıkarılır) — hata çevrimi burada geçici olarak inline yapılır
// (docs/10_IMPLEMENTATION_ROADMAP.md §3.1).

/** `meta.requestId` — log korelasyonu için rastgele kısa kimlik (docs/03_API_CONTRACTS.md §2). */
function generateRequestId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

/** Kaynak: docs/03_API_CONTRACTS.md §5.1 — bu veri pratikte hiç değişmez. */
const CACHE_CONTROL = 'public, max-age=86400';

export async function GET(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const generatedAt = new Date().toISOString();

  try {
    const data = await getAssetClasses();

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

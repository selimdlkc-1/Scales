import { prisma } from '@terazi/core';
import { NextResponse } from 'next/server';

// Route handler (controller katmanı) — yalnızca DB bağlantı kontrolü + yanıt
// biçimlendirme, iş kuralı içermez (.claude/rules/10-backend-architecture.md).
//
// `docs/03_API_CONTRACTS.md §5.4`: bu tek endpoint response envelope'unu
// KULLANMAZ — hosting platformunun health check parser'ları sade `{status,database}`
// JSON'u bekler, `{data,meta}` sarmalaması burada bilinçli olarak yapılmaz.
// Rate limit de yoktur (docs/03 §6) — İterasyon 5'teki merkezi middleware
// zincirine bu endpoint dahil edilmez.

export async function GET(): Promise<NextResponse> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: 'ok', database: 'ok' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { status: 'degraded', database: 'error' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

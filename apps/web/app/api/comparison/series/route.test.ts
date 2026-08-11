// Integration test — gerçek lokal Postgres'e karşı çalışır (docker compose up -d +
// prisma migrate deploy + seed önkoşuldur, docs/08_TESTING_STRATEGY.md §5).
// `assets`/`asset_classes` Faz 1 §1.3 seed'iyle statik doldurulur; bu test yalnızca
// kendi `AssetPrice` fixture satırlarını yazar ve sonunda temizler
// (`comparison/route.test.ts` ile aynı kalıp).
//
// CI'da `apps/web`/`apps/worker`/`packages/core` testleri aynı paylaşımlı Postgres'e
// karşı PARALEL çalışır. `tcmb-job.test.ts` USDTRY/EURTRY/XAUTRY + `period_month='2025-08'`'i,
// `coingecko-job.test.ts` BTC/ETH/SOL/BNB/XRP'yi, `tefas-job.test.ts` yalnızca
// TEFAS:AFO/AAV/BBF'yi kendi `beforeEach`'inde silip yeniden yazıyor — bu
// semboller burada KULLANILMAZ. `comparison/route.test.ts` da fon varlıklarına
// fiyat yazıyor ama TAMAMEN FARKLI bir tarih aralığında (2029-2030) çalışıyor;
// bu dosya 2031'i kullanır — aynı `(asset_id, as_of_date)` çiftine asla
// yazılmadığı için iki dosyanın aynı fon assetId'sini seçmesi bile güvenlidir.
import { prisma } from '@terazi/core';
import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route.js';

const TEFAS_JOB_TEST_SYMBOLS = ['TEFAS:AFO', 'TEFAS:AAV', 'TEFAS:BBF'];

// `vi.setSystemTime` ile sabitlenen "bugün" — dönem hesabı bu tarihe göre yapılır
// (series-service.ts `subtractPeriod`/`buildSampleDates`). `comparison/route.test.ts`nin
// 2029-2030 penceresinden bilinçli olarak uzak seçildi (dosya başı not).
const TODAY = new Date('2031-06-10T12:00:00Z');
const START_1M = new Date('2031-05-10T00:00:00Z'); // TODAY - 1m
const END_DATE = new Date('2031-06-10T00:00:00Z'); // TODAY'nin takvim günü

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/comparison/series?${query}`);
}

async function cleanFixture(assetIds: bigint[]): Promise<void> {
  await prisma.assetPrice.deleteMany({
    where: { assetId: { in: assetIds }, asOfDate: { in: [START_1M, END_DATE] } },
  });
}

describe('GET /api/comparison/series', () => {
  let assetASymbol: string;
  let assetAId: bigint;
  let assetBSymbol: string;
  let assetBId: bigint;
  let fiveSymbols: string[];

  beforeAll(async () => {
    const funds = await prisma.asset.findMany({
      where: {
        isActive: true,
        assetClass: { code: 'fund' },
        symbol: { notIn: TEFAS_JOB_TEST_SYMBOLS },
      },
      orderBy: { symbol: 'asc' },
      take: 6,
    });

    if (funds.length < 6) {
      throw new Error('Fixture için en az 6 aktif fon bekleniyor (seed script kontrol edilmeli).');
    }

    assetAId = funds[0]!.id;
    assetASymbol = funds[0]!.symbol;
    assetBId = funds[1]!.id;
    assetBSymbol = funds[1]!.symbol;
    fiveSymbols = funds.slice(0, 5).map((fund) => fund.symbol);

    await cleanFixture([assetAId, assetBId]);
    await prisma.assetPrice.createMany({
      data: [
        { assetId: assetAId, asOfDate: START_1M, price: '100.000000' },
        { assetId: assetAId, asOfDate: END_DATE, price: '120.000000' },
        { assetId: assetBId, asOfDate: START_1M, price: '50.000000' },
        { assetId: assetBId, asOfDate: END_DATE, price: '55.000000' },
      ],
    });
  });

  afterAll(async () => {
    await cleanFixture([assetAId, assetBId]);
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('2 varlık (alt sınır) için 200 döner, dönem başı 100 ve doğru normalize değer', async () => {
    const response = await GET(makeRequest(`assets=${assetASymbol},${assetBSymbol}&period=1m`));

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: {
        period: string;
        series: Array<{ symbol: string; points: Array<{ date: string; value: string | null }> }>;
      };
      meta: { requestId: string; generatedAt: string };
    };

    expect(body.data.period).toBe('1m');
    const seriesA = body.data.series.find((series) => series.symbol === assetASymbol);
    const seriesB = body.data.series.find((series) => series.symbol === assetBSymbol);

    expect(seriesA?.points).toEqual([
      { date: '2031-05-10', value: '100.000000' },
      { date: '2031-06-10', value: '120.000000' },
    ]);
    expect(seriesB?.points).toEqual([
      { date: '2031-05-10', value: '100.000000' },
      { date: '2031-06-10', value: '110.000000' },
    ]);
    expect(body.meta.requestId).toEqual(expect.any(String));
  });

  it('5 varlık (üst sınır) için 200 döner, 5 seri üretir', async () => {
    const response = await GET(makeRequest(`assets=${fiveSymbols.join(',')}&period=1m`));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { series: unknown[] } };
    expect(body.data.series).toHaveLength(5);
  });

  it('1 varlık için 400 INVALID_ASSET_SELECTION döner', async () => {
    const response = await GET(makeRequest(`assets=${assetASymbol}&period=1m`));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; details: { count: number } } };
    expect(body.error.code).toBe('INVALID_ASSET_SELECTION');
    expect(body.error.details).toEqual({ count: 1 });
  });

  it('6 varlık için 400 INVALID_ASSET_SELECTION döner', async () => {
    const sixFunds = await prisma.asset.findMany({
      where: {
        isActive: true,
        assetClass: { code: 'fund' },
        symbol: { notIn: TEFAS_JOB_TEST_SYMBOLS },
      },
      orderBy: { symbol: 'asc' },
      take: 6,
    });
    const response = await GET(
      makeRequest(`assets=${sixFunds.map((fund) => fund.symbol).join(',')}&period=1m`),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; details: { count: number } } };
    expect(body.error.code).toBe('INVALID_ASSET_SELECTION');
    expect(body.error.details).toEqual({ count: 6 });
  });

  it('geçersiz sembol nedeniyle çözülen varlık sayısı 2 altına düşerse 400 INVALID_ASSET_SELECTION döner', async () => {
    const response = await GET(makeRequest(`assets=${assetASymbol},NOPEXYZ&period=1m`));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; details: { count: number } } };
    expect(body.error.code).toBe('INVALID_ASSET_SELECTION');
    expect(body.error.details).toEqual({ count: 1 });
  });

  it('geçersiz period için 400 INVALID_PERIOD döner', async () => {
    const response = await GET(makeRequest(`assets=${assetASymbol},${assetBSymbol}&period=10y`));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_PERIOD');
  });

  it('assets eksikse 400 VALIDATION_ERROR döner', async () => {
    const response = await GET(makeRequest('period=1m'));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('kripto varlık içeren yanıtta kısa cache header döner', async () => {
    // BTC'ye fiyat yazılmaz — yalnızca cache kararını etkiler, `coingecko-job.test.ts`
    // ile satır çakışması olmaz (dosya başı not).
    const response = await GET(makeRequest(`assets=BTC,${assetASymbol}&period=1m`));

    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, stale-while-revalidate=3600',
    );
  });

  it('kripto içermeyen yanıtta standart cache header döner', async () => {
    const response = await GET(makeRequest(`assets=${assetASymbol},${assetBSymbol}&period=1m`));

    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=3600, stale-while-revalidate=86400',
    );
  });
});

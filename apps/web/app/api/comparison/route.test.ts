// Integration test — gerçek lokal Postgres'e karşı çalışır (docker compose up -d +
// prisma migrate deploy + seed önkoşuldur, docs/08_TESTING_STRATEGY.md §5).
// `assets`/`asset_classes` Faz 1 §1.3 seed'iyle statik doldurulur; bu test yalnızca
// kendi `AssetPrice`/`CpiIndex` fixture satırlarını yazar ve sonunda temizler
// (worker job testlerindeki `seed*/clean*` kalıbıyla tutarlı, bkz. `tcmb-job.test.ts`).
//
// CI'da `apps/web`/`apps/worker`/`packages/core` testleri aynı paylaşımlı Postgres'e
// karşı PARALEL çalışır (turbo/pnpm -w). `tcmb-job.test.ts` USDTRY/EURTRY/XAUTRY +
// `period_month='2025-08'`'i, `coingecko-job.test.ts` BTC/ETH/SOL/BNB/XRP'yi,
// `tefas-job.test.ts` yalnızca TEFAS:AFO/AAV/BBF'yi kendi `beforeEach`'inde silip
// yeniden yazıyor — bu semboller/ay burada KULLANILMAZ (fiyat/TÜFE fixture'ı
// yazılan bir varlık), aksi halde paralel çalıştırmada satırlar silinip flaky
// hataya yol açar. Fiyat yazmadan yalnızca okunan BTC (cache header testi)
// istisnadır — status'üne bakılmaz, yalnızca `assetClass` kontrol edilir.
import { prisma } from '@terazi/core';
import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route.js';

// tefas-job.test.ts'in kendi fixture'ı için kullandığı fonlar — çakışmayı önlemek
// için bu iki test fonu bu listenin dışından seçilir.
const TEFAS_JOB_TEST_SYMBOLS = ['TEFAS:AFO', 'TEFAS:AAV', 'TEFAS:BBF'];

// `vi.setSystemTime` ile sabitlenen "bugün" — dönem hesabı bu tarihe göre yapılır
// (comparison-service.ts `subtractPeriod`). Gerçek takvimden bilinçli olarak uzak
// seçildi ki `CPI_START_MONTH`/`CPI_END_MONTH` hiçbir worker test ayıyla çakışmasın.
const TODAY = new Date('2030-01-15T12:00:00Z');
const START_1Y = new Date('2029-01-15T00:00:00Z'); // TODAY - 1y
const END_DATE = new Date('2030-01-15T00:00:00Z'); // TODAY'nin takvim günü
const CPI_START_MONTH = '2029-01';
const CPI_END_MONTH = '2030-01';

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/comparison?${query}`);
}

async function cleanFixture(assetId: bigint): Promise<void> {
  await prisma.assetPrice.deleteMany({
    where: { assetId, asOfDate: { in: [START_1Y, END_DATE] } },
  });
  await prisma.cpiIndex.deleteMany({
    where: { periodMonth: { in: [CPI_START_MONTH, CPI_END_MONTH] } },
  });
}

describe('GET /api/comparison', () => {
  let priceFundId: bigint;
  let priceFundSymbol: string;
  let emptyFundSymbol: string;

  beforeAll(async () => {
    const [priceFund, emptyFund] = await Promise.all([
      prisma.asset.findFirstOrThrow({
        where: {
          isActive: true,
          assetClass: { code: 'fund' },
          symbol: { notIn: TEFAS_JOB_TEST_SYMBOLS },
        },
        orderBy: { symbol: 'asc' },
      }),
      prisma.asset.findFirstOrThrow({
        where: {
          isActive: true,
          assetClass: { code: 'fund' },
          symbol: { notIn: TEFAS_JOB_TEST_SYMBOLS },
        },
        orderBy: { symbol: 'desc' },
      }),
    ]);
    priceFundId = priceFund.id;
    priceFundSymbol = priceFund.symbol;
    emptyFundSymbol = emptyFund.symbol;

    await cleanFixture(priceFundId);
    await prisma.assetPrice.createMany({
      data: [
        { assetId: priceFundId, asOfDate: START_1Y, price: '32.150000' },
        { assetId: priceFundId, asOfDate: END_DATE, price: '34.820000' },
      ],
    });
    await prisma.cpiIndex.createMany({
      data: [
        { periodMonth: CPI_START_MONTH, indexValue: '2000.0000', asOfDate: START_1Y },
        { periodMonth: CPI_END_MONTH, indexValue: '2200.0000', asOfDate: END_DATE },
      ],
    });
  });

  afterAll(async () => {
    await cleanFixture(priceFundId);
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dolu veri satırı için 200 döner, status=ok ve doğru nominal getiri', async () => {
    const response = await GET(makeRequest(`assets=${priceFundSymbol}&period=1y`));

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { period: string; rows: Array<Record<string, unknown>> };
      meta: { requestId: string; generatedAt: string };
    };

    expect(body.data.period).toBe('1y');
    expect(body.data.rows).toEqual([
      expect.objectContaining({
        symbol: priceFundSymbol,
        assetClass: 'fund',
        status: 'ok',
        startPrice: '32.150000',
        endPrice: '34.820000',
        nominalReturn: expect.any(String),
        realReturn: expect.any(String),
      }),
    ]);
    expect(Number(body.data.rows[0]?.nominalReturn)).toBeCloseTo(34.82 / 32.15 - 1, 6);
    expect(body.meta.requestId).toEqual(expect.any(String));
  });

  it("fiyat verisi olmayan varlık için status='unavailable' döner, diğer alanlar null", async () => {
    const response = await GET(makeRequest(`assets=${emptyFundSymbol}&period=1y`));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { rows: Array<Record<string, unknown>> } };

    expect(body.data.rows).toEqual([
      {
        symbol: emptyFundSymbol,
        assetClass: 'fund',
        status: 'unavailable',
        startPrice: null,
        endPrice: null,
        startDate: null,
        endDate: null,
        nominalReturn: null,
        realReturn: null,
        asOfDate: null,
      },
    ]);
  });

  it('sortBy=symbol&sortDir=asc iki varlığı alfabetik sıralar', async () => {
    const response = await GET(
      makeRequest(
        `assets=${priceFundSymbol},${emptyFundSymbol}&period=1y&sortBy=symbol&sortDir=asc`,
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { rows: Array<{ symbol: string }> } };
    const symbols = body.data.rows.map((row) => row.symbol);

    expect(symbols).toEqual([...symbols].sort());
    expect(symbols).toHaveLength(2);
  });

  it('geçersiz period için 400 INVALID_PERIOD döner', async () => {
    const response = await GET(makeRequest(`assets=${priceFundSymbol}&period=10y`));

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { code: string; details: { field: string; received: string } };
    };

    expect(body.error.code).toBe('INVALID_PERIOD');
    expect(body.error.details).toEqual({ field: 'period', received: '10y' });
  });

  it('period eksikse 400 INVALID_PERIOD döner', async () => {
    const response = await GET(makeRequest(`assets=${priceFundSymbol}`));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };

    expect(body.error.code).toBe('INVALID_PERIOD');
  });

  it('geçersiz sortBy için 400 VALIDATION_ERROR döner', async () => {
    const response = await GET(
      makeRequest(`assets=${priceFundSymbol}&period=1y&sortBy=priceChange`),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { code: string; details: { field: string; received: string } };
    };

    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual({ field: 'sortBy', received: 'priceChange' });
  });

  it('kripto varlık içeren yanıtta kısa cache header döner', async () => {
    // BTC'ye fiyat yazılmaz — yalnızca `assetClass` cache kararını etkiler,
    // `coingecko-job.test.ts` ile satır çakışması olmaz (bkz. dosya başı not).
    const response = await GET(makeRequest(`assets=BTC,${priceFundSymbol}&period=1y`));

    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, stale-while-revalidate=3600',
    );
  });

  it('kripto içermeyen yanıtta standart cache header döner', async () => {
    const response = await GET(makeRequest(`assets=${priceFundSymbol}&period=1y`));

    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=3600, stale-while-revalidate=86400',
    );
  });
});

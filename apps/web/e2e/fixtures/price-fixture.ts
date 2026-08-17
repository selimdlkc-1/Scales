import { prisma } from '@terazi/core';

// e2e/global-setup.ts VE spec dosyaları AYNI sembolü bilmek zorunda —
// hardcode etmek yerine ikisi de bu modüldeki tek çözümleme fonksiyonunu
// çağırır (deterministik: `symbol asc` sıralaması, aynı seed verisiyle her
// zaman aynı fon döner). Bu, route.test.ts'teki `notIn` deseniyle tutarlıdır
// (bkz. apps/web/app/api/comparison/route.test.ts).
//
// Rezerve semboller apps/worker'ın job testlerinin kendi fixture'ını yazdığı
// satırlardır (bkz. memory `ci-cross-package-db-fixture-collision`) — bu e2e
// job'u kendi izole Postgres servisinde çalışsa da aynı disiplin korunur,
// çünkü playwright.config.ts geliştiricinin paylaşımlı lokal DB'sine karşı da
// çalıştırılabilir.
const RESERVED_SYMBOLS = [
  'USDTRY',
  'EURTRY',
  'XAUTRY',
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'XRP',
  'TEFAS:AFO',
  'TEFAS:AAV',
  'TEFAS:BBF',
];

export interface FixtureFund {
  id: bigint;
  symbol: string;
}

export async function resolveFixtureFund(): Promise<FixtureFund> {
  const fund = await prisma.asset.findFirstOrThrow({
    where: {
      isActive: true,
      assetClass: { code: 'fund' },
      symbol: { notIn: RESERVED_SYMBOLS },
    },
    orderBy: { symbol: 'asc' },
  });

  return { id: fund.id, symbol: fund.symbol };
}

/** `Date` → `'YYYY-MM'` (comparison-service.ts `toMonthString` ile birebir aynı dönüşüm). */
function toMonthString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function monthsAgo(from: Date, months: number): Date {
  const result = new Date(from);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

function yearsAgo(from: Date, years: number): Date {
  const result = new Date(from);
  result.setUTCFullYear(result.getUTCFullYear() - years);
  return result;
}

// Gerçek Next.js sunucusuna karşı çalıştığımız için (docs/08_TESTING_STRATEGY.md
// §6 — fixture değil) `comparison-service.ts`'in `subtractPeriod`'unun kullandığı
// "bugün" gerçek saat — bu yüzden fiyat/TÜFE noktaları seed anındaki gerçek
// tarihe göre üretilir. Seed ile asıl istek arasındaki birkaç dakikalık kayma,
// ay/yıl aralıklarının yanında ihmal edilebilir (bkz. dosya başı yorum).
export interface PriceFixturePlan {
  fund: FixtureFund;
  now: Date;
  oneMonthAgo: Date;
  threeMonthsAgo: Date;
  oneYearAgo: Date;
}

export async function buildPriceFixturePlan(): Promise<PriceFixturePlan> {
  const fund = await resolveFixtureFund();
  const now = new Date();

  return {
    fund,
    now,
    oneMonthAgo: monthsAgo(now, 1),
    threeMonthsAgo: monthsAgo(now, 3),
    oneYearAgo: yearsAgo(now, 1),
  };
}

// Dönem değişikliği journey'i (§4.5) 1Y ↔ 1A arasında geçiş yapıp tablo
// hücresinin GERÇEKTEN değiştiğini doğruluyor — bu yüzden fiyat noktaları
// kasıtlı olarak birbirinden belirgin şekilde farklı (real-return.ts sıfıra
// bölme yapmadığı sürece herhangi bir pozitif fiyat seti işe yarar, ama büyük
// bir fark testin flaky olma ihtimalini azaltır).
const PRICE_AT_NOW = '145.500000';
const PRICE_AT_1M = '138.200000';
const PRICE_AT_3M = '121.750000';
const PRICE_AT_1Y = '82.400000';

const CPI_AT_NOW = '2600.0000';
const CPI_AT_1M = '2560.0000';
const CPI_AT_3M = '2440.0000';
const CPI_AT_1Y = '2000.0000';

/**
 * İdempotent upsert — Playwright `globalSetup` birden fazla kez (lokal tekrar
 * çalıştırma) tetiklenebilir, `create` kullanılmaz (.claude/rules/16-database-prisma.md
 * ile aynı disiplin, `(asset_id, as_of_date)`/`period_month` unique kısıtına dayanır).
 */
export async function seedPriceFixture(plan: PriceFixturePlan): Promise<void> {
  const { fund, now, oneMonthAgo, threeMonthsAgo, oneYearAgo } = plan;

  const pricePoints: Array<{ asOfDate: Date; price: string }> = [
    { asOfDate: now, price: PRICE_AT_NOW },
    { asOfDate: oneMonthAgo, price: PRICE_AT_1M },
    { asOfDate: threeMonthsAgo, price: PRICE_AT_3M },
    { asOfDate: oneYearAgo, price: PRICE_AT_1Y },
  ];

  await Promise.all(
    pricePoints.map((point) =>
      prisma.assetPrice.upsert({
        where: { assetId_asOfDate: { assetId: fund.id, asOfDate: point.asOfDate } },
        create: { assetId: fund.id, asOfDate: point.asOfDate, price: point.price },
        update: { price: point.price },
      }),
    ),
  );

  const cpiPoints: Array<{ periodMonth: string; asOfDate: Date; indexValue: string }> = [
    { periodMonth: toMonthString(now), asOfDate: now, indexValue: CPI_AT_NOW },
    { periodMonth: toMonthString(oneMonthAgo), asOfDate: oneMonthAgo, indexValue: CPI_AT_1M },
    { periodMonth: toMonthString(threeMonthsAgo), asOfDate: threeMonthsAgo, indexValue: CPI_AT_3M },
    { periodMonth: toMonthString(oneYearAgo), asOfDate: oneYearAgo, indexValue: CPI_AT_1Y },
  ];

  await Promise.all(
    cpiPoints.map((point) =>
      prisma.cpiIndex.upsert({
        where: { periodMonth: point.periodMonth },
        create: point,
        update: { indexValue: point.indexValue, asOfDate: point.asOfDate },
      }),
    ),
  );
}

export async function cleanPriceFixture(plan: PriceFixturePlan): Promise<void> {
  const { fund, now, oneMonthAgo, threeMonthsAgo, oneYearAgo } = plan;

  await prisma.assetPrice.deleteMany({
    where: { assetId: fund.id, asOfDate: { in: [now, oneMonthAgo, threeMonthsAgo, oneYearAgo] } },
  });
  await prisma.cpiIndex.deleteMany({
    where: {
      periodMonth: {
        in: [
          toMonthString(now),
          toMonthString(oneMonthAgo),
          toMonthString(threeMonthsAgo),
          toMonthString(oneYearAgo),
        ],
      },
    },
  });
}

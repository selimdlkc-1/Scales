// Integration test — gerçek lokal Postgres'e karşı çalışır (docker compose up -d +
// prisma migrate deploy önkoşuldur, docs/08_TESTING_STRATEGY.md §5). Gerçek CoinGecko
// endpoint'ine asla gidilmez — `fetchCoingeckoMarketChart` vi.mock() ile taklit edilir
// (.claude/rules/35-testing.md). Bu dosya "bir coin'in bozukluğu/çekilememesi diğerlerini
// etkilemez" davranışını (docs/10_IMPLEMENTATION_ROADMAP.md §2.3) ve idempotent upsert'i
// kanıtlar.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { prisma } from '@terazi/core';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCoingeckoMarketChart } from '../clients/coingecko-client.js';
import { runCoingeckoJob } from './coingecko-job.js';

vi.mock('../clients/coingecko-client.js', () => ({
  fetchCoingeckoMarketChart: vi.fn(),
}));

const mockedFetchCoingeckoMarketChart = vi.mocked(fetchCoingeckoMarketChart);

// JSON import assertion sürüm uyumu belirsizliğini önlemek için fs ile okunur
// (docs/08_TESTING_STRATEGY.md §5 — sabit fixture, gerçek dış API'ye gidilmez).
function loadFixture(name: string): Record<string, unknown> {
  const path = fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
}

const coingeckoSuccessFixture = loadFixture('coingecko-success.json');
const coingeckoMalformedFixture = loadFixture('coingecko-malformed.json');

const ASSET_CLASSES = [{ code: 'crypto', nameTr: 'Kripto Para', sortOrder: 3 }] as const;

// docs/02_DATABASE_SCHEMA.md §9 — 5 coin, Faz 1 §1.3 seed'iyle aynı symbol/externalRef eşlemesi.
const COINGECKO_ASSETS = [
  { classCode: 'crypto', symbol: 'BTC', nameTr: 'Bitcoin', externalRef: 'bitcoin' },
  { classCode: 'crypto', symbol: 'ETH', nameTr: 'Ethereum', externalRef: 'ethereum' },
  { classCode: 'crypto', symbol: 'SOL', nameTr: 'Solana', externalRef: 'solana' },
  { classCode: 'crypto', symbol: 'BNB', nameTr: 'BNB', externalRef: 'binancecoin' },
  { classCode: 'crypto', symbol: 'XRP', nameTr: 'Ripple', externalRef: 'ripple' },
] as const;

/** İdempotent seed — Faz 1 §1.3 seed.ts'teki upsert kalıbıyla tutarlı (16-database-prisma.md). */
async function seedCoingeckoAssets(): Promise<bigint[]> {
  const assetIds: bigint[] = [];
  for (const assetClass of ASSET_CLASSES) {
    const classRow = await prisma.assetClass.upsert({
      where: { code: assetClass.code },
      create: assetClass,
      update: { nameTr: assetClass.nameTr, sortOrder: assetClass.sortOrder },
    });
    for (const asset of COINGECKO_ASSETS.filter((a) => a.classCode === assetClass.code)) {
      const row = await prisma.asset.upsert({
        where: { symbol: asset.symbol },
        create: {
          assetClassId: classRow.id,
          symbol: asset.symbol,
          nameTr: asset.nameTr,
          dataSource: 'coingecko',
          externalRef: asset.externalRef,
        },
        update: { dataSource: 'coingecko', externalRef: asset.externalRef, isActive: true },
      });
      assetIds.push(row.id);
    }
  }
  return assetIds;
}

async function cleanCoingeckoTestData(assetIds: bigint[]): Promise<void> {
  await prisma.assetPrice.deleteMany({ where: { assetId: { in: assetIds } } });
  await prisma.jobRun.deleteMany({ where: { dataSource: 'coingecko' } });
}

describe('runCoingeckoJob', () => {
  let assetIds: bigint[];

  beforeEach(async () => {
    vi.clearAllMocks();
    assetIds = await seedCoingeckoAssets();
    await cleanCoingeckoTestData(assetIds);
  });

  afterAll(async () => {
    await cleanCoingeckoTestData(assetIds);
  });

  it('5 coin de geçerli fixture ile success döner, tüm günler upsert edilir', async () => {
    mockedFetchCoingeckoMarketChart.mockImplementation(({ coinId }) =>
      Promise.resolve(coingeckoSuccessFixture[coinId]),
    );

    const result = await runCoingeckoJob();

    // 5 coin × 2 gün = 10 geçerli kayıt.
    expect(result.status).toBe('success');
    expect(result.recordsUpserted).toBe(10);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('success');
    expect(jobRun.errorMessage).toBeNull();
    expect(jobRun.recordsUpserted).toBe(10);

    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(10);
  });

  it(
    "1 coin bozuk fixture'ında partial döner, bozuk coin atlanır, diğer 4 coin'in " +
      'tüm günleri upsert edilir',
    async () => {
      mockedFetchCoingeckoMarketChart.mockImplementation(({ coinId }) =>
        Promise.resolve(coingeckoMalformedFixture[coinId]),
      );

      const result = await runCoingeckoJob();

      // Geçerli: bitcoin/ethereum/binancecoin/ripple × 2 gün = 8. Atlanan: solana
      // (2. gün fiyatı string tipinde — schema tüm coin'i reddeder).
      expect(result.status).toBe('partial');
      expect(result.recordsUpserted).toBe(8);

      const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
      expect(jobRun.status).toBe('partial');
      expect(jobRun.errorMessage).toContain('1 coin');
      expect(jobRun.recordsUpserted).toBe(8);

      const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
      expect(priceCount).toBe(8);

      const solanaAssetId = assetIds[COINGECKO_ASSETS.findIndex((a) => a.symbol === 'SOL')];
      const solanaPriceCount = await prisma.assetPrice.count({ where: { assetId: solanaAssetId } });
      expect(solanaPriceCount).toBe(0);
    },
  );

  it(
    "bir coin'in tüm retry denemeleri tükenirse (ağ hatası) yalnızca o coin atlanır, " +
      'diğerleri etkilenmez',
    async () => {
      mockedFetchCoingeckoMarketChart.mockImplementation(({ coinId }) => {
        if (coinId === 'ripple') {
          return Promise.reject(new Error('ECONNRESET'));
        }
        return Promise.resolve(coingeckoSuccessFixture[coinId]);
      });

      const result = await runCoingeckoJob();

      // 4 coin başarılı × 2 gün = 8; ripple retry tükenip atlanır.
      expect(result.status).toBe('partial');
      expect(result.recordsUpserted).toBe(8);
      // ripple: 1 ilk deneme + 3 tekrar deneme = 4 çağrı; diğer 4 coin 1'er çağrı = 8 toplam.
      expect(mockedFetchCoingeckoMarketChart).toHaveBeenCalledTimes(8);

      const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
      expect(jobRun.status).toBe('partial');
      expect(jobRun.errorMessage).toContain('1 coin');
    },
    15_000,
  );

  it('izlenen coingecko varlığı yoksa job failed olur, hiçbir kayıt yazılmaz', async () => {
    await prisma.asset.deleteMany({ where: { dataSource: 'coingecko' } });

    const result = await runCoingeckoJob();

    expect(result.status).toBe('failed');
    expect(result.recordsUpserted).toBe(0);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('failed');
    expect(jobRun.errorMessage).toContain('bulunamadı');

    // Sonraki testler/afterAll temizliği için test verisini yeniden oluştur.
    assetIds = await seedCoingeckoAssets();
  });

  it('aynı gün için iki kez çalıştırıldığında veri çoğalmaz (idempotent upsert)', async () => {
    mockedFetchCoingeckoMarketChart.mockImplementation(({ coinId }) =>
      Promise.resolve(coingeckoSuccessFixture[coinId]),
    );

    const first = await runCoingeckoJob();
    const second = await runCoingeckoJob();

    expect(first.recordsUpserted).toBe(10);
    expect(second.recordsUpserted).toBe(10);

    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(10);
  });
});

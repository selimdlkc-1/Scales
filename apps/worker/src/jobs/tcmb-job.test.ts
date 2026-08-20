// Integration test — gerçek lokal Postgres'e karşı çalışır (docker compose up -d +
// prisma migrate deploy önkoşuldur, docs/08_TESTING_STRATEGY.md §5). Gerçek TCMB
// EVDS API'sine asla gidilmez — `fetchTcmbSeries` vi.mock() ile taklit edilir
// (.claude/rules/35-testing.md).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { prisma } from '@terazi/core';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTcmbSeries } from '../clients/tcmb-client.js';
import { runTcmbJob } from './tcmb-job.js';

vi.mock('../clients/tcmb-client.js', () => ({
  fetchTcmbSeries: vi.fn(),
}));

const mockedFetchTcmbSeries = vi.mocked(fetchTcmbSeries);

// JSON import assertion sürüm uyumu belirsizliğini önlemek için fs ile okunur
// (docs/08_TESTING_STRATEGY.md §5 — sabit fixture, gerçek dış API'ye gidilmez).
function loadFixture(name: string): unknown {
  const path = fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const tcmbSuccessFixture = loadFixture('tcmb-success.json');
const tcmbMalformedFixture = loadFixture('tcmb-malformed.json');

const ASSET_CLASSES = [
  { code: 'fx', nameTr: 'Döviz', sortOrder: 1 },
  { code: 'gold', nameTr: 'Altın', sortOrder: 2 },
] as const;

const TCMB_ASSETS = [
  { classCode: 'fx', symbol: 'USDTRY', nameTr: 'Amerikan Doları', externalRef: 'TP.DK.USD.A.YTL' },
  { classCode: 'fx', symbol: 'EURTRY', nameTr: 'Euro', externalRef: 'TP.DK.EUR.A.YTL' },
  { classCode: 'gold', symbol: 'XAUTRY', nameTr: 'Gram Altın', externalRef: 'TP.MK.ALTIN.YTL' },
] as const;

const CPI_PERIOD_MONTH = '2025-08';

/** İdempotent seed — Faz 1 §1.3 seed.ts'teki upsert kalıbıyla tutarlı (16-database-prisma.md). */
async function seedTcmbAssets(): Promise<bigint[]> {
  const assetIds: bigint[] = [];
  for (const assetClass of ASSET_CLASSES) {
    const classRow = await prisma.assetClass.upsert({
      where: { code: assetClass.code },
      create: assetClass,
      update: { nameTr: assetClass.nameTr, sortOrder: assetClass.sortOrder },
    });
    for (const asset of TCMB_ASSETS.filter((a) => a.classCode === assetClass.code)) {
      const row = await prisma.asset.upsert({
        where: { symbol: asset.symbol },
        create: {
          assetClassId: classRow.id,
          symbol: asset.symbol,
          nameTr: asset.nameTr,
          dataSource: 'tcmb',
          externalRef: asset.externalRef,
        },
        update: { dataSource: 'tcmb', externalRef: asset.externalRef },
      });
      assetIds.push(row.id);
    }
  }
  return assetIds;
}

async function cleanTcmbTestData(assetIds: bigint[]): Promise<void> {
  await prisma.assetPrice.deleteMany({ where: { assetId: { in: assetIds } } });
  await prisma.cpiIndex.deleteMany({ where: { periodMonth: CPI_PERIOD_MONTH } });
  await prisma.jobRun.deleteMany({ where: { dataSource: 'tcmb' } });
}

describe('runTcmbJob', () => {
  let assetIds: bigint[];

  beforeEach(async () => {
    vi.clearAllMocks();
    assetIds = await seedTcmbAssets();
    await cleanTcmbTestData(assetIds);
  });

  afterAll(async () => {
    await cleanTcmbTestData(assetIds);
  });

  it('geçerli fixture ile success döner, tüm kayıtlar upsert edilir', async () => {
    mockedFetchTcmbSeries.mockResolvedValue(tcmbSuccessFixture);

    const result = await runTcmbJob();

    // USD 3 gün + EUR 2 gün (1 gün tatil/null) + altın 3 gün + TÜFE 1 ay = 9.
    expect(result.status).toBe('success');
    expect(result.recordsUpserted).toBe(9);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('success');
    expect(jobRun.errorMessage).toBeNull();
    expect(jobRun.recordsUpserted).toBe(9);

    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(8); // 3 usd + 2 eur + 3 altın

    const cpiRow = await prisma.cpiIndex.findUnique({ where: { periodMonth: CPI_PERIOD_MONTH } });
    expect(cpiRow?.indexValue.toString()).toBe('2686.68');
  });

  it("bozuk veri fixture'ında partial döner, geçersiz kayıt atlanır, kalanlar upsert edilir", async () => {
    mockedFetchTcmbSeries.mockResolvedValue(tcmbMalformedFixture);

    const result = await runTcmbJob();

    // EUR'un 06-08 kaydı ("35,95,00") geçersiz decimal — atlanır, geri kalan 8 kayıt upsert edilir.
    expect(result.status).toBe('partial');
    expect(result.recordsUpserted).toBe(8);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('partial');
    expect(jobRun.errorMessage).toContain('1 kayıt');

    const eurAssetId = assetIds[1];
    const eurPriceCount = await prisma.assetPrice.count({ where: { assetId: eurAssetId } });
    expect(eurPriceCount).toBe(1); // yalnızca 05-08 geçerli
  });

  it('client sürekli başarısız olursa retry sonunda failed olarak işaretlenir, önceki veri korunur', async () => {
    mockedFetchTcmbSeries.mockResolvedValue(tcmbSuccessFixture);
    const firstRun = await runTcmbJob();
    expect(firstRun.status).toBe('success');

    mockedFetchTcmbSeries.mockClear();
    mockedFetchTcmbSeries.mockRejectedValue(new Error('ECONNRESET'));

    const result = await runTcmbJob();

    expect(result.status).toBe('failed');
    expect(result.recordsUpserted).toBe(0);
    // 1 ilk deneme + 3 tekrar deneme (1s→2s→4s backoff, docs/04_BACKEND_SPEC.md §8).
    expect(mockedFetchTcmbSeries).toHaveBeenCalledTimes(4);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('failed');
    expect(jobRun.errorMessage).toContain('ECONNRESET');

    // Graceful degradation: önceki başarılı çalıştırmanın verisi DB'de değişmeden kalır.
    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(8);
  }, 15_000);

  it('yanıt zarfı yapısal olarak bozuksa (items eksik) job failed olur, hiçbir kayıt yazılmaz', async () => {
    mockedFetchTcmbSeries.mockResolvedValue({ notItems: [] });

    const result = await runTcmbJob();

    expect(result.status).toBe('failed');
    expect(result.recordsUpserted).toBe(0);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('failed');
    expect(jobRun.errorMessage).toContain('doğrulanamadı');

    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(0);
  });

  it('pozitif olmayan (negatif/sıfır) fiyat veya TÜFE değeri şema doğrulamasından geçer ama job seviyesinde atlanır (partial)', async () => {
    // tcmbEvdsItemSchema yalnızca "string|null" garantisi verir (catchall) —
    // negatif/sıfır değerler Zod'dan geçer; job seviyesindeki
    // parsePositiveDecimal'ın isFinite/lessThanOrEqualTo(0) kontrolü bu ek
    // güvenlik ağını sağlar (docs/08_TESTING_STRATEGY.md §4).
    mockedFetchTcmbSeries.mockResolvedValue({
      items: [
        {
          Tarih: '05-08-2025',
          TP_DK_USD_A_YTL: '-5,00',
          TP_DK_EUR_A_YTL: '32,90',
          TP_MK_ALTIN_YTL: '0,00',
          TP_FG_J0: '0,00',
        },
      ],
    });

    const result = await runTcmbJob();

    // Yalnızca EUR geçerli; USD negatif, altın sıfır, TÜFE sıfır — 3 kayıt atlanır.
    expect(result.status).toBe('partial');
    expect(result.recordsUpserted).toBe(1);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('partial');
    expect(jobRun.errorMessage).toContain('3 kayıt');

    const [usdAssetId, eurAssetId] = assetIds;
    const eurPriceCount = await prisma.assetPrice.count({ where: { assetId: eurAssetId } });
    expect(eurPriceCount).toBe(1);
    const usdPriceCount = await prisma.assetPrice.count({ where: { assetId: usdAssetId } });
    expect(usdPriceCount).toBe(0);

    const cpiCount = await prisma.cpiIndex.count({ where: { periodMonth: CPI_PERIOD_MONTH } });
    expect(cpiCount).toBe(0);
  });

  it('tüm kayıtlar geçersiz (negatif/sıfır) değer içerirse job failed olur, hiçbir kayıt yazılmaz', async () => {
    mockedFetchTcmbSeries.mockResolvedValue({
      items: [
        {
          Tarih: '05-08-2025',
          TP_DK_USD_A_YTL: '-5,00',
          TP_DK_EUR_A_YTL: '0,00',
          TP_MK_ALTIN_YTL: '-10,00',
          TP_FG_J0: '-100,00',
        },
      ],
    });

    const result = await runTcmbJob();

    expect(result.status).toBe('failed');
    expect(result.recordsUpserted).toBe(0);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('failed');
    expect(jobRun.errorMessage).toContain('İşlenebilir kayıt bulunamadı');
    expect(jobRun.errorMessage).toContain('4 kayıt');

    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(0);

    const cpiCount = await prisma.cpiIndex.count({ where: { periodMonth: CPI_PERIOD_MONTH } });
    expect(cpiCount).toBe(0);
  });

  it('aynı gün için iki kez çalıştırıldığında veri çoğalmaz (idempotent upsert)', async () => {
    mockedFetchTcmbSeries.mockResolvedValue(tcmbSuccessFixture);

    const first = await runTcmbJob();
    const second = await runTcmbJob();

    expect(first.recordsUpserted).toBe(9);
    expect(second.recordsUpserted).toBe(9);

    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(8);

    const cpiCount = await prisma.cpiIndex.count({ where: { periodMonth: CPI_PERIOD_MONTH } });
    expect(cpiCount).toBe(1);
  });
});

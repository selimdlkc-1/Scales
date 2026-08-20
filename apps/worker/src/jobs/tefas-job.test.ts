// Integration test — gerçek lokal Postgres'e karşı çalışır (docker compose up -d +
// prisma migrate deploy önkoşuldur, docs/08_TESTING_STRATEGY.md §5). Gerçek TEFAS
// endpoint'ine asla gidilmez — `fetchTefasHistory` vi.mock() ile taklit edilir
// (.claude/rules/35-testing.md). Bu dosya SEC-007'nin en kritik uygulama noktasını
// kanıtlar (docs/07_SECURITY_IMPLEMENTATION.md §1) — kayıt-bazlı doğrulama, `partial`
// durumu, en az 3 farklı bozukluk türü (eksik alan, beklenmeyen tip, ondalık ayraç
// varyasyonu) ve izlenmeyen fonların sessizce göz ardı edilmesi.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { prisma } from '@terazi/core';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTefasHistory } from '../clients/tefas-client.js';
import { runTefasJob } from './tefas-job.js';

vi.mock('../clients/tefas-client.js', () => ({
  fetchTefasHistory: vi.fn(),
}));

const mockedFetchTefasHistory = vi.mocked(fetchTefasHistory);

// JSON import assertion sürüm uyumu belirsizliğini önlemek için fs ile okunur
// (docs/08_TESTING_STRATEGY.md §5 — sabit fixture, gerçek dış API'ye gidilmez).
function loadFixture(name: string): unknown {
  const path = fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const tefasSuccessFixture = loadFixture('tefas-success.json');
const tefasMalformedFixture = loadFixture('tefas-malformed.json');

// asset_classes.code, migration.sql'deki CHECK constraint'i ile ('fx'|'gold'|'crypto'|'fund')
// dörtlüsüne kısıtlıdır — TEFAS şemsiye kategorileri (Hisse/Borçlanma/Altın/Değişken) ayrı bir
// şema alanı olarak SAKLANMAZ (packages/core/prisma/seed-data/tefas-funds.ts madde), tüm TEFAS
// fonları tek `fund` sınıfına girer.
const ASSET_CLASSES = [{ code: 'fund', nameTr: 'Yatırım Fonu', sortOrder: 4 }] as const;

// XYZ bilinçli olarak seed'e dahil edilmez — tefas-malformed.json'daki "izlenmeyen fon"
// senaryosunun (kapsam dışı, hata değil) test edilmesini sağlar.
const TEFAS_ASSETS = [
  { classCode: 'fund', symbol: 'TEFAS:AFO', nameTr: 'Ak Portföy Altın Fonu', externalRef: 'AFO' },
  {
    classCode: 'fund',
    symbol: 'TEFAS:AAV',
    nameTr: 'Ata Portföy İkinci Hisse Senedi Fonu',
    externalRef: 'AAV',
  },
  {
    classCode: 'fund',
    symbol: 'TEFAS:BBF',
    nameTr: 'Pardus Portföy Birinci Borçlanma Araçları Fonu',
    externalRef: 'BBF',
  },
] as const;

/** İdempotent seed — Faz 1 §1.3 seed.ts'teki upsert kalıbıyla tutarlı (16-database-prisma.md). */
async function seedTefasAssets(): Promise<bigint[]> {
  const assetIds: bigint[] = [];
  for (const assetClass of ASSET_CLASSES) {
    const classRow = await prisma.assetClass.upsert({
      where: { code: assetClass.code },
      create: assetClass,
      update: { nameTr: assetClass.nameTr, sortOrder: assetClass.sortOrder },
    });
    for (const asset of TEFAS_ASSETS.filter((a) => a.classCode === assetClass.code)) {
      const row = await prisma.asset.upsert({
        where: { symbol: asset.symbol },
        create: {
          assetClassId: classRow.id,
          symbol: asset.symbol,
          nameTr: asset.nameTr,
          dataSource: 'tefas',
          externalRef: asset.externalRef,
        },
        update: { dataSource: 'tefas', externalRef: asset.externalRef },
      });
      assetIds.push(row.id);
    }
  }
  return assetIds;
}

async function cleanTefasTestData(assetIds: bigint[]): Promise<void> {
  await prisma.assetPrice.deleteMany({ where: { assetId: { in: assetIds } } });
  await prisma.jobRun.deleteMany({ where: { dataSource: 'tefas' } });
}

describe('runTefasJob', () => {
  let assetIds: bigint[];

  beforeEach(async () => {
    vi.clearAllMocks();
    assetIds = await seedTefasAssets();
    await cleanTefasTestData(assetIds);
  });

  afterAll(async () => {
    await cleanTefasTestData(assetIds);
  });

  it('geçerli fixture ile success döner, tüm kayıtlar upsert edilir', async () => {
    mockedFetchTefasHistory.mockResolvedValue(tefasSuccessFixture);

    const result = await runTefasJob();

    // 3 fon × 2 gün = 6 geçerli kayıt.
    expect(result.status).toBe('success');
    expect(result.recordsUpserted).toBe(6);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('success');
    expect(jobRun.errorMessage).toBeNull();
    expect(jobRun.recordsUpserted).toBe(6);

    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(6);
  });

  it(
    "bozuk veri fixture'ında partial döner, 3 farklı bozukluk türü + izlenmeyen fon " +
      'doğru şekilde ele alınır, geçerli kayıtlar upsert edilir',
    async () => {
      mockedFetchTefasHistory.mockResolvedValue(tefasMalformedFixture);

      const result = await runTefasJob();

      // Geçerli: 3 kayıt (AFO/AAV/BBF, ilk gün). Atlanan: 3 kayıt (FONKODU eksik,
      // FIYAT boolean, FIYAT virgüllü ondalık). XYZ (izlenmeyen fon) hem upsert
      // edilmez hem atlanan sayısına dahil edilmez — sessizce göz ardı edilir.
      expect(result.status).toBe('partial');
      expect(result.recordsUpserted).toBe(3);

      const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
      expect(jobRun.status).toBe('partial');
      expect(jobRun.errorMessage).toContain('3 kayıt');
      expect(jobRun.recordsUpserted).toBe(3);

      const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
      expect(priceCount).toBe(3);

      // XYZ, seed edilmemiş (izlenmeyen fon) olduğu için hiçbir asset_prices satırıyla eşleşmez.
      const xyzAssetCount = await prisma.asset.count({ where: { externalRef: 'XYZ' } });
      expect(xyzAssetCount).toBe(0);
    },
  );

  it("FIYAT şema doğrulamasından geçer (string '0.00') ama pozitif olmadığı için job seviyesinde atlanır (partial)", async () => {
    // tefasFundRecordSchema'nın FIYAT string dalı yalnızca "\d+(\.\d+)?" ondalık
    // formatını garanti eder, pozitiflik kontrolü yapmaz (yalnızca number dalı
    // `.positive()` içerir) — job seviyesindeki parsePositiveDecimal bu ek
    // güvenlik ağını sağlar (docs/08_TESTING_STRATEGY.md §4).
    mockedFetchTefasHistory.mockResolvedValue({
      data: [
        { TARIH: '/Date(1754352000000)/', FONKODU: 'AFO', FIYAT: '0.00' },
        { TARIH: '/Date(1754352000000)/', FONKODU: 'AAV', FIYAT: '12.50' },
      ],
    });

    const result = await runTefasJob();

    expect(result.status).toBe('partial');
    expect(result.recordsUpserted).toBe(1);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('partial');
    expect(jobRun.errorMessage).toContain('1 kayıt');

    const [afoAssetId, aavAssetId] = assetIds;
    const afoPriceCount = await prisma.assetPrice.count({ where: { assetId: afoAssetId } });
    expect(afoPriceCount).toBe(0);
    const aavPriceCount = await prisma.assetPrice.count({ where: { assetId: aavAssetId } });
    expect(aavPriceCount).toBe(1);
  });

  it('client sürekli başarısız olursa retry sonunda failed olarak işaretlenir, önceki veri korunur', async () => {
    mockedFetchTefasHistory.mockResolvedValue(tefasSuccessFixture);
    const firstRun = await runTefasJob();
    expect(firstRun.status).toBe('success');

    mockedFetchTefasHistory.mockClear();
    mockedFetchTefasHistory.mockRejectedValue(new Error('ECONNRESET'));

    const result = await runTefasJob();

    expect(result.status).toBe('failed');
    expect(result.recordsUpserted).toBe(0);
    // 1 ilk deneme + 3 tekrar deneme (1s→2s→4s backoff, docs/04_BACKEND_SPEC.md §8).
    expect(mockedFetchTefasHistory).toHaveBeenCalledTimes(4);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('failed');
    expect(jobRun.errorMessage).toContain('ECONNRESET');

    // Graceful degradation: önceki başarılı çalıştırmanın verisi DB'de değişmeden kalır.
    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(6);
  }, 15_000);

  it('yanıt zarfı yapısal olarak bozuksa (data eksik) job failed olur, hiçbir kayıt yazılmaz', async () => {
    mockedFetchTefasHistory.mockResolvedValue({ notData: [] });

    const result = await runTefasJob();

    expect(result.status).toBe('failed');
    expect(result.recordsUpserted).toBe(0);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('failed');
    expect(jobRun.errorMessage).toContain('doğrulanamadı');

    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(0);
  });

  it('data boş dizi ise (zarf geçerli ama kayıt yok) job failed olur', async () => {
    mockedFetchTefasHistory.mockResolvedValue({ data: [] });

    const result = await runTefasJob();

    expect(result.status).toBe('failed');
    expect(result.recordsUpserted).toBe(0);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('failed');
    expect(jobRun.errorMessage).toContain('boş dizi');
  });

  it('izlenen fonların hiçbiri yanıtta yoksa (hepsi başka fon) job failed olur', async () => {
    mockedFetchTefasHistory.mockResolvedValue({
      data: [{ TARIH: '/Date(1754352000000)/', FONKODU: 'ZZZ', FIYAT: 1.0 }],
    });

    const result = await runTefasJob();

    expect(result.status).toBe('failed');
    expect(result.recordsUpserted).toBe(0);

    const jobRun = await prisma.jobRun.findUniqueOrThrow({ where: { id: result.jobRunId } });
    expect(jobRun.status).toBe('failed');
    expect(jobRun.errorMessage).toContain('bulunamadı');
  });

  it('aynı gün için iki kez çalıştırıldığında veri çoğalmaz (idempotent upsert)', async () => {
    mockedFetchTefasHistory.mockResolvedValue(tefasSuccessFixture);

    const first = await runTefasJob();
    const second = await runTefasJob();

    expect(first.recordsUpserted).toBe(6);
    expect(second.recordsUpserted).toBe(6);

    const priceCount = await prisma.assetPrice.count({ where: { assetId: { in: assetIds } } });
    expect(priceCount).toBe(6);
  });
});

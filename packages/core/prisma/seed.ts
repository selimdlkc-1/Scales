// Terazi — idempotent seed script (Faz 1 §1.3)
// Kaynak: docs/02_DATABASE_SCHEMA.md §9, docs/01_DOMAIN_MODEL.md §2.1-2.2,
// docs/10_IMPLEMENTATION_ROADMAP.md §1.3.
//
// İdempotency: her satır `code`/`symbol` üzerinden upsert edilir (create-or-update),
// asla plain `create` kullanılmaz — script iki kez çalıştırıldığında satır sayısı değişmez
// (.claude/rules/16-database-prisma.md).
//
// Tek PrismaClient kuralı (.claude/rules/10-backend-architecture.md): yeni bir client
// oluşturmak yerine packages/core'un tekil singleton'ı import edilir.
import { prisma } from '../src/prisma/client.js';
import { tefasFunds } from './seed-data/tefas-funds.js';

// docs/02_DATABASE_SCHEMA.md §2.1 — 4 satırlık statik referans verisi.
const assetClasses = [
  { code: 'fx', nameTr: 'Döviz', sortOrder: 1 },
  { code: 'gold', nameTr: 'Altın', sortOrder: 2 },
  { code: 'crypto', nameTr: 'Kripto Para', sortOrder: 3 },
  { code: 'fund', nameTr: 'Yatırım Fonu', sortOrder: 4 },
] as const;

// docs/00_PROJECT_OVERVIEW.md §2 — döviz/altın (TCMB EVDS) + kripto (CoinGecko).
// externalRef: TCMB EVDS seri kodu / CoinGecko coin id (docs/02 §2.2).
//
// Not: USD/TRY ve EUR/TRY seri kodları (TP.DK.<CCY>.A.YTL, "alış" serisi) EVDS dokümantasyonuyla
// doğrulanmıştır. Gram altın seri kodu (TP.MK.ALTIN.YTL) best-effort tahmindir — Faz 2 §2.1'de
// gerçek TCMB EVDS client'ı yazılırken EVDS panelinden (evds3.tcmb.gov.tr) teyit edilmeli;
// yanlışsa yalnızca bu satırın `external_ref` değeri güncellenir (worker/DB şeması etkilenmez).
// CoinGecko coin id'leri (bitcoin/ethereum/solana/binancecoin/ripple) CoinGecko'nun kendi
// `/coins/list` uç noktasındaki sabit kimliklerdir.
const fxGoldCryptoAssets = [
  {
    classCode: 'fx',
    symbol: 'USDTRY',
    nameTr: 'Amerikan Doları',
    dataSource: 'tcmb',
    externalRef: 'TP.DK.USD.A.YTL',
  },
  {
    classCode: 'fx',
    symbol: 'EURTRY',
    nameTr: 'Euro',
    dataSource: 'tcmb',
    externalRef: 'TP.DK.EUR.A.YTL',
  },
  {
    classCode: 'gold',
    symbol: 'XAUTRY',
    nameTr: 'Gram Altın',
    dataSource: 'tcmb',
    externalRef: 'TP.MK.ALTIN.YTL',
  },
  {
    classCode: 'crypto',
    symbol: 'BTC',
    nameTr: 'Bitcoin',
    dataSource: 'coingecko',
    externalRef: 'bitcoin',
  },
  {
    classCode: 'crypto',
    symbol: 'ETH',
    nameTr: 'Ethereum',
    dataSource: 'coingecko',
    externalRef: 'ethereum',
  },
  {
    classCode: 'crypto',
    symbol: 'SOL',
    nameTr: 'Solana',
    dataSource: 'coingecko',
    externalRef: 'solana',
  },
  {
    classCode: 'crypto',
    symbol: 'BNB',
    nameTr: 'BNB',
    dataSource: 'coingecko',
    externalRef: 'binancecoin',
  },
  {
    classCode: 'crypto',
    symbol: 'XRP',
    nameTr: 'Ripple',
    dataSource: 'coingecko',
    externalRef: 'ripple',
  },
] as const;

async function seedAssetClasses(): Promise<Map<string, bigint>> {
  const codeToId = new Map<string, bigint>();
  for (const assetClass of assetClasses) {
    const row = await prisma.assetClass.upsert({
      where: { code: assetClass.code },
      create: assetClass,
      update: { nameTr: assetClass.nameTr, sortOrder: assetClass.sortOrder },
    });
    codeToId.set(assetClass.code, row.id);
  }
  return codeToId;
}

async function seedFxGoldCryptoAssets(classCodeToId: Map<string, bigint>): Promise<void> {
  for (const asset of fxGoldCryptoAssets) {
    const assetClassId = classCodeToId.get(asset.classCode);
    if (assetClassId === undefined) {
      throw new Error(`Bilinmeyen asset class code: ${asset.classCode}`);
    }
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      create: {
        assetClassId,
        symbol: asset.symbol,
        nameTr: asset.nameTr,
        dataSource: asset.dataSource,
        externalRef: asset.externalRef,
      },
      update: {
        nameTr: asset.nameTr,
        dataSource: asset.dataSource,
        externalRef: asset.externalRef,
      },
    });
  }
}

async function seedTefasFunds(classCodeToId: Map<string, bigint>): Promise<void> {
  const fundClassId = classCodeToId.get('fund');
  if (fundClassId === undefined) {
    throw new Error('Bilinmeyen asset class code: fund');
  }
  for (const fund of tefasFunds) {
    const symbol = `TEFAS:${fund.code}`;
    await prisma.asset.upsert({
      where: { symbol },
      create: {
        assetClassId: fundClassId,
        symbol,
        nameTr: fund.nameTr,
        dataSource: 'tefas',
        externalRef: fund.code,
      },
      update: {
        nameTr: fund.nameTr,
        dataSource: 'tefas',
        externalRef: fund.code,
      },
    });
  }
}

/**
 * Tüm seed adımlarını çalıştırır ve sonuç satır sayılarını döner.
 * `seed.test.ts` idempotency testi de bu fonksiyonu (iki kez) çağırır — CLI
 * entrypoint'i (`main`) ile aynı seed mantığının test edilmesini garantiler.
 */
export async function runSeed(): Promise<{ assetClassCount: number; assetCount: number }> {
  const classCodeToId = await seedAssetClasses();
  await seedFxGoldCryptoAssets(classCodeToId);
  await seedTefasFunds(classCodeToId);

  const assetClassCount = await prisma.assetClass.count();
  const assetCount = await prisma.asset.count();
  return { assetClassCount, assetCount };
}

async function main(): Promise<void> {
  const { assetClassCount, assetCount } = await runSeed();
  console.log(`Seed tamamlandı: ${assetClassCount} asset_classes, ${assetCount} assets.`);
}

// Yalnızca `prisma db seed` ile doğrudan çalıştırıldığında CLI girişini tetikle —
// `seed.test.ts` bu dosyayı import ettiğinde main() otomatik çalışmasın.
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  main()
    .catch((error: unknown) => {
      console.error('Seed başarısız:', error);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}

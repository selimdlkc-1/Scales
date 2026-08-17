import { prisma } from '@terazi/core';

import { buildPriceFixturePlan, seedPriceFixture } from './fixtures/price-fixture.js';
import { savePlan } from './fixtures/plan-store.js';

// Playwright `globalSetup` — `webServer` ayağa kalkmadan ÖNCE tam olarak bir
// kez çalışır (playwright.config.ts). Bu e2e job'unun kendi Postgres servisine
// karşı çalıştığı varsayılır; `asset_classes`/`assets` referans verisinin
// (Faz 1 §1.3 `db:seed`) CI adımında veya lokal `pnpm --filter core db:seed`
// ile önceden yüklenmiş olması önkoşuldur (docs/08_TESTING_STRATEGY.md §5 test
// veritabanı stratejisiyle tutarlı) — bu script yalnızca dönem değişikliği
// journey'i için gereken `AssetPrice`/`CpiIndex` fixture'ını ekler.
export default async function globalSetup(): Promise<void> {
  const plan = await buildPriceFixturePlan();
  await seedPriceFixture(plan);
  await savePlan(plan);
  await prisma.$disconnect();
}

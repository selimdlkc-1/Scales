import { prisma } from '@terazi/core';

import { cleanPriceFixture } from './fixtures/price-fixture.js';
import { deletePlanFile, loadPlan } from './fixtures/plan-store.js';

// Playwright `globalTeardown` — tüm testler bittikten sonra tam olarak bir kez
// çalışır. CI'daki e2e job'u kendi tek-kullanımlık Postgres servisiyle
// çalıştığından bu adım orada zorunlu değildir, ama lokal geliştirmede
// paylaşımlı bir DB'ye karşı tekrar tekrar `playwright test` çalıştırıldığında
// fixture satırlarının birikmemesi için (idempotent upsert zaten güvenli, ama
// temiz DB durumu tercih edilir) satırlar silinir.
export default async function globalTeardown(): Promise<void> {
  const plan = await loadPlan();
  await cleanPriceFixture(plan);
  await deletePlanFile();
  await prisma.$disconnect();
}

// docs/10_IMPLEMENTATION_ROADMAP.md §1.3 kalite kapısı: "Seed'in upsert mantığı için en az
// 1 test — ikinci çağrıda yeni satır eklemediğini doğrulayan"
// (docs/08_TESTING_STRATEGY.md §4 idempotency deny senaryosunun seed'e uyarlanmış hali).
//
// Bu bir integration testtir (docs/08 §1) — lokal Postgres'e ihtiyaç duyar
// (docs/09_DEV_WORKFLOW.md: `docker compose up -d` + `prisma migrate dev` önkoşuldur).
import { describe, expect, it } from 'vitest';

import { runSeed } from './seed.js';

describe('runSeed', () => {
  it(
    'iki kez art arda çalıştırıldığında asset_classes/assets satır sayısı değişmez',
    async () => {
      const first = await runSeed();
      const second = await runSeed();

      expect(second.assetClassCount).toBe(first.assetClassCount);
      expect(second.assetCount).toBe(first.assetCount);

      // docs/10_IMPLEMENTATION_ROADMAP.md §1.3: 4 asset_classes, 68 assets (8 döviz/altın/kripto + 60 TEFAS fonu).
      expect(first.assetClassCount).toBe(4);
      expect(first.assetCount).toBe(68);
    },
    30_000,
  );
});

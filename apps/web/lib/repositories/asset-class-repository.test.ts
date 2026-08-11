// Integration test — gerçek lokal Postgres'e karşı çalışır (docker compose up -d +
// prisma migrate deploy + seed önkoşuldur, docs/08_TESTING_STRATEGY.md §5).
// `asset_classes` Faz 1 §1.3 seed'iyle statik/idempotent doldurulur — bu test
// kendi veri seti yazmaz, mevcut referans veriyi salt okur.
import { describe, expect, it } from 'vitest';

import { findAllAssetClasses } from './asset-class-repository.js';

describe('findAllAssetClasses', () => {
  it('4 varlık sınıfını sort_order sıralı döner', async () => {
    const rows = await findAllAssetClasses();

    expect(rows).toEqual([
      { code: 'fx', nameTr: 'Döviz', sortOrder: 1 },
      { code: 'gold', nameTr: 'Altın', sortOrder: 2 },
      { code: 'crypto', nameTr: 'Kripto Para', sortOrder: 3 },
      { code: 'fund', nameTr: 'Yatırım Fonu', sortOrder: 4 },
    ]);
  });
});

// Integration test — gerçek lokal Postgres'e karşı çalışır (docker compose up -d +
// prisma migrate deploy + seed önkoşuldur, docs/08_TESTING_STRATEGY.md §5).
// `assets` Faz 1 §1.3 seed'iyle statik/idempotent doldurulur (8 döviz/altın/kripto +
// 60 TEFAS fonu = 68) — bu test kendi veri seti yazmaz, mevcut referans veriyi salt okur.
import { describe, expect, it } from 'vitest';

import { findActiveAssets } from './asset-repository.js';

describe('findActiveAssets', () => {
  it('filtresiz çağrıda tüm aktif varlıkları döner (68 satır)', async () => {
    const rows = await findActiveAssets();

    expect(rows).toHaveLength(68);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        symbol: expect.any(String),
        nameTr: expect.any(String),
        assetClassCode: expect.any(String),
      }),
    );
  });

  it('assetClass filtreli çağrıda yalnızca o sınıftaki varlıkları döner', async () => {
    const rows = await findActiveAssets({ assetClass: 'fx' });

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.assetClassCode === 'fx')).toBe(true);
    expect(rows.map((row) => row.symbol).sort()).toEqual(['EURTRY', 'USDTRY']);
  });

  it('crypto filtresiyle yalnızca 5 kripto varlığı döner', async () => {
    const rows = await findActiveAssets({ assetClass: 'crypto' });

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.assetClassCode === 'crypto')).toBe(true);
  });

  it('bilinmeyen assetClass için boş dizi döner', async () => {
    const rows = await findActiveAssets({ assetClass: 'nonexistent' });

    expect(rows).toEqual([]);
  });
});

// Unit test — repository'ler `vi.mock()` ile taklit edilir, gerçek DB'ye gitmez
// (.claude/rules/10-backend-architecture.md: "repository fonksiyonları saf,
// bağımsız export'lardır — testte vi.mock() ile taklit edilir").
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindAllAssetClasses = vi.fn();
const mockFindActiveAssets = vi.fn();

vi.mock('../repositories/asset-class-repository.js', () => ({
  findAllAssetClasses: (...args: unknown[]) => mockFindAllAssetClasses(...args),
}));
vi.mock('../repositories/asset-repository.js', () => ({
  findActiveAssets: (...args: unknown[]) => mockFindActiveAssets(...args),
}));

const { getAssetClasses, getAssets } = await import('./reference-data-service.js');

describe('reference-data-service', () => {
  beforeEach(() => {
    mockFindAllAssetClasses.mockReset();
    mockFindActiveAssets.mockReset();
  });

  describe('getAssetClasses', () => {
    it("repository satırlarını camelCase DTO'ya dönüştürür", async () => {
      mockFindAllAssetClasses.mockResolvedValue([{ code: 'fx', nameTr: 'Döviz', sortOrder: 1 }]);

      const result = await getAssetClasses();

      expect(result).toEqual([{ code: 'fx', nameTr: 'Döviz', sortOrder: 1 }]);
    });
  });

  describe('getAssets', () => {
    it("assetClass parametresini repository'ye iletir ve DTO döner", async () => {
      mockFindActiveAssets.mockResolvedValue([
        { symbol: 'USDTRY', nameTr: 'Amerikan Doları', assetClassCode: 'fx' },
      ]);

      const result = await getAssets({ assetClass: 'fx' });

      expect(mockFindActiveAssets).toHaveBeenCalledWith({ assetClass: 'fx' });
      expect(result).toEqual([{ symbol: 'USDTRY', nameTr: 'Amerikan Doları', assetClass: 'fx' }]);
    });

    it("assetClass verilmediğinde repository'ye undefined iletir", async () => {
      mockFindActiveAssets.mockResolvedValue([]);

      await getAssets();

      expect(mockFindActiveAssets).toHaveBeenCalledWith({ assetClass: undefined });
    });
  });
});

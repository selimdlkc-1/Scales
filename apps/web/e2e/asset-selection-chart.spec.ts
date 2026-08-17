import { expect, test } from '@playwright/test';

// Journey 2 — Varlık seçimi ve grafik render (Orta risk,
// docs/08_TESTING_STRATEGY.md §6): AssetSelector'da 3 varlık seçilince
// ReturnChart'ın (Recharts, next/dynamic lazy-load) gerçekten mount olduğunu
// doğrular. Döviz/altın sembolleri (USDTRY/EURTRY/XAUTRY) Faz 1 §1.3 referans
// seed'inde her zaman var — fiyat fixture'ı gerekmez, `AssetSelector` fiyat
// verisinden bağımsız çalışır ve grafik, tüm noktaları `null` bir seri için
// de render edilir (apps/web/components/comparison/return-chart.tsx
// `buildChartData`, eksik fiyatı sıfır/tahmini değere yuvarlamaz).
test.describe('Varlık seçimi ve grafik', () => {
  test('3 varlık seçilince normalize edilmiş getiri grafiği görünür', async ({ page }) => {
    await page.goto('/');

    const symbols = ['USDTRY', 'EURTRY', 'XAUTRY'];
    for (const symbol of symbols) {
      await page.getByRole('checkbox', { name: new RegExp(symbol) }).check();
    }

    const chart = page.getByRole('img', {
      name: 'Seçilen varlıkların normalize edilmiş getiri grafiği',
    });
    await expect(chart).toBeVisible();

    // Seçilen 3 varlık, seçim listesinin üstündeki badge'lerde de görünür
    // olmalı (docs/06_SCREEN_CATALOG.md §4 — seçim durumu her zaman görünür).
    // Badge etiketi `nameTr` kullanır (symbol değil), bu yüzden sembol yerine
    // "seçimini kaldır" kaldırma butonu sayısı doğrulanır.
    await expect(page.getByRole('button', { name: /seçimini kaldır/ })).toHaveCount(symbols.length);
  });
});

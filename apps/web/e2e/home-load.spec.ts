import { expect, test } from '@playwright/test';

// Journey 1 — Ana sayfa yükleme ve tablo render (Yüksek risk,
// docs/08_TESTING_STRATEGY.md §6): S-HOME'un ürünün temel değer önerisini
// (karşılaştırma tablosu) gerçekten gösterdiğini doğrular. Fiyat fixture'ı
// gerektirmez — Faz 1 §1.3 referans seed'i (asset_classes/assets) yeterlidir,
// fiyatı olmayan varlıklar da "Veri yok" satırı olarak render edilir
// (apps/web/components/comparison/comparison-table.tsx `unavailableRows`).
test.describe('Ana sayfa yükleme', () => {
  test('S-HOME açılır ve karşılaştırma tablosu satırlarla render olur', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Terazi', level: 1 })).toBeVisible();

    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    // Kolon başlıkları (Sembol, Nominal Getiri, Reel Getiri…) `docs/06
    // §4` alan sözleşmesinin ekranda gerçekten karşılığı var mı — en azından
    // "Sembol" ve "Reel Getiri" başlığı görünür olmalı.
    await expect(table.getByRole('columnheader', { name: 'Sembol' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Reel Getiri' })).toBeVisible();

    const dataRows = table.locator('tbody tr');
    await expect(dataRows.first()).toBeVisible();
    expect(await dataRows.count()).toBeGreaterThan(1);

    // Sabit uyarı ([P-006]) her sayfada bulunur — S-HOME de istisna değil.
    await expect(page.getByText(/geçmiş performans/i)).toBeVisible();
  });
});

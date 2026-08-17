import { expect, test } from '@playwright/test';

import { resolveFixtureFund } from './fixtures/price-fixture.js';

// Journey 3 — Dönem değişikliği (Orta risk, docs/08_TESTING_STRATEGY.md §6):
// dönem seçici değiştirildiğinde tablo verisinin GERÇEKTEN değiştiğini
// doğrular (yalnızca URL/aria-pressed değil). Bunun deterministik olması için
// `global-setup.ts`'in seed ettiği tek fon fixture'ı kullanılır — bu fonun
// 1Y ve 1A dönemleri arasında belirgin farklı fiyat/TÜFE noktaları vardır
// (apps/web/e2e/fixtures/price-fixture.ts), bu yüzden Reel Getiri hücresi iki
// dönem arasında kesinlikle farklı bir değer gösterir.
test.describe('Dönem değişikliği', () => {
  test('dönem seçici değişince tablodaki reel getiri değeri güncellenir', async ({ page }) => {
    const fund = await resolveFixtureFund();

    await page.goto('/');

    const row = page.getByRole('row', { name: new RegExp(fund.symbol) });
    await expect(row).toBeVisible();
    // Reel Getiri kolonu — Sembol, Varlık Sınıfı, Nominal Getiri, Reel Getiri, Veri Tarihi.
    const realReturnCell = row.getByRole('cell').nth(3);

    // Varsayılan dönem 1Y (app/page.tsx `DEFAULT_PERIOD`).
    await expect(realReturnCell).not.toHaveText('—');
    const initialValue = await realReturnCell.textContent();

    await page
      .getByRole('group', { name: 'Dönem seçici' })
      .getByRole('button', { name: '1A' })
      .click();
    await expect(page).toHaveURL(/period=1m/);

    await expect(realReturnCell).not.toHaveText(initialValue ?? '');
    await expect(realReturnCell).not.toHaveText('—');
  });
});

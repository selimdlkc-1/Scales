import { expect, test } from '@playwright/test';

// Journey 4 — Operatör paneli erişimi (docs/08_TESTING_STRATEGY.md §6, Faz 5 §5.2):
// (1) Basic Auth olmadan `/admin` isteğinin gerçekten `401` döndüğünü doğrular
// (`apps/web/middleware.ts`'in çalıştığının kanıtı), (2) doğru credential ile
// panelin gerçekten render olduğunu, `JobRunTable`/`SourceHealthCard`in dolu
// olduğunu ve S-HOME'a özel `DisclaimerFooter`/nav linkinin ([AP-002] tek yönlü
// navigasyon) sızmadığını doğrular.
//
// `OPERATOR_USERNAME`/`OPERATOR_PASSWORD` CI'da tanımlı değildir (yalnızca
// `DATABASE_URL` set edilir, bkz. .github/workflows/ci.yml `e2e` job'u —
// `lib/middleware/with-admin-auth.test.ts`teki notla aynı sebep) — bu yüzden (2)
// numaralı test yalnızca bu değişkenler tanımlıysa (lokal `.env`) çalışır.
test.describe('Operatör paneli erişimi', () => {
  test('Basic Auth olmadan /admin isteği 401 döner', async ({ page }) => {
    const response = await page.goto('/admin');

    expect(response?.status()).toBe(401);
  });

  test('doğru credential ile panel render olur, JobRunTable ve SourceHealthCard dolu', async ({
    browser,
  }) => {
    const username = process.env.OPERATOR_USERNAME;
    const password = process.env.OPERATOR_PASSWORD;
    test.skip(!username || !password, 'OPERATOR_USERNAME/OPERATOR_PASSWORD tanımlı değil');

    const context = await browser.newContext({
      httpCredentials: { username: username ?? '', password: password ?? '' },
    });
    const page = await context.newPage();

    try {
      const response = await page.goto('/admin');
      expect(response?.status()).toBe(200);

      await expect(page.getByRole('heading', { name: 'Terazi — Operatör Paneli' })).toBeVisible();

      // 3 kaynak sağlık kartı (docs/06_SCREEN_CATALOG.md §4).
      await expect(page.getByRole('heading', { name: 'TCMB' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'TEFAS' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'CoinGecko' })).toBeVisible();

      // Job çalıştırma tablosu — lokal DB'de worker hiç çalışmamışsa `job_runs`
      // boş olabilir (global-setup.ts yalnızca fiyat fixture'ı ekler, job_runs
      // seed etmez), bu yüzden hem `success` (tablo dolu) hem `empty` (docs/06
      // §4 "Henüz çalıştırma kaydı yok.") durumu geçerli kabul edilir — asıl
      // doğrulanan şey middleware+API+auth zincirinin gerçekten çalıştığıdır.
      const table = page.getByRole('table');
      const emptyMessage = page.getByText('Henüz çalıştırma kaydı yok.');
      await expect(table.or(emptyMessage)).toBeVisible();
      if (await table.isVisible()) {
        await expect(table.getByRole('columnheader', { name: 'Kaynak' })).toBeVisible();
        await expect(table.getByRole('columnheader', { name: 'Durum' })).toBeVisible();
      }

      // Operatör paneli S-HOME'un DisclaimerFooter'ını göstermez ([AP-002] tek
      // yönlü navigasyon, docs/06 §2/§6).
      await expect(page.getByText(/geçmiş performans/i)).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});

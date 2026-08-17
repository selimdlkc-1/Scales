import { defineConfig, devices } from '@playwright/test';

// Smoke e2e — yalnızca 3 kritik journey (docs/08_TESTING_STRATEGY.md §6,
// docs/10_IMPLEMENTATION_ROADMAP.md §4.5). Kapsamlı bir tarayıcı/viewport
// matrisi kurulmaz ([TEST-001]) — tek proje (Chromium) yeterlidir.
//
// `webServer`, gerçek Next.js dev sunucusunu (fixture değil, gerçek API
// route'ları — docs/08 §6) 3100 portunda başlatır; geliştiricinin kendi
// `pnpm --filter web dev` (3000) örneğiyle çakışmaması için ayrı port
// seçilmiştir. Sunucunun DATABASE_URL'i CI/lokal ortamdan miras alınır
// (Playwright `webServer` varsayılan olarak `process.env`'i devralır).
const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `pnpm run dev -- -p <port>` bazı pnpm sürümlerinde `--`'yi olduğu gibi
    // alt komuta iletiyor (next CLI bunu proje dizini sanıp hata veriyor) —
    // `next` binary'si doğrudan `pnpm exec` ile çağrılarak bu belirsizlik
    // ortadan kaldırılır.
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

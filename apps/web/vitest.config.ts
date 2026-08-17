import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// %60+ coverage eşiği (docs/08_TESTING_STRATEGY.md §2, .claude/rules/04-quality-gates.md).
// UI component'leri (.tsx) coverage kapsamı dışıdır — [P-004] gereği veri/servis
// katmanı önceliklidir, presentation doğrulaması Playwright smoke e2e ile yapılır
// (İterasyon 5, docs/10_IMPLEMENTATION_ROADMAP.md §4.5); yine de render doğruluğu
// (ör. DisclaimerFooter) burada test edilir, yalnızca coverage ölçümüne dahil değildir.
export default defineConfig({
  // Vite'ın varsayılan esbuild JSX transform'u 'automatic' değildir — React'i
  // otomatik import etmez. .tsx test dosyalarının (DisclaimerFooter, RootLayout
  // render testleri) derlenebilmesi için açıkça belirtilir.
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    // tsconfig.json'daki "@/*": ["./*"] path alias'ının Vitest karşılığı —
    // Vite bunu tsconfig'ten otomatik okumaz.
    alias: {
      '@': dirname,
    },
  },
  test: {
    environment: 'node',
    include: [
      'app/**/*.test.ts',
      'app/**/*.test.tsx',
      'lib/**/*.test.ts',
      'components/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/**/*.ts', 'lib/**/*.ts'],
      exclude: ['app/**/*.test.ts', 'lib/**/*.test.ts', 'app/**/*.tsx'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
});

import { defineConfig } from 'vitest/config';

// Coverage threshold'ları bu iterasyonda henüz zorlanmıyor — İterasyon 4'te
// (hesaplama fonksiyonları) %90 eşiğiyle birlikte eklenecek
// (docs/10_IMPLEMENTATION_ROADMAP.md §1.4, .claude/rules/04-quality-gates.md).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'prisma/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});

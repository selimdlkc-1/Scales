import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      'apps/web/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { unicorn },
    rules: {
      // CODE-003 (.claude/rules/02-language-naming.md): dosya/klasör adları kebab-case.
      // Next.js App Router'ın ayrılmış dosyaları (page.tsx, layout.tsx, route.ts, ...)
      // tek kelime oldukları için bu kuralla çakışmaz; dinamik route segmentleri
      // ([id], [...slug]) klasör adıdır, bu kural yalnızca dosya adını denetler.
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      // `_` önekli parametreler kasıtlı olarak kullanılmaz — middleware zinciri
      // (docs/04_BACKEND_SPEC.md §4) `(request: NextRequest) => ...` imzasını
      // handler'lar arası tutarlı tutmak için `request`'i gerektirir, ancak bazı
      // handler'lar (örn. `GET /api/asset-classes` — parametresiz endpoint) onu
      // gövdesinde kullanmaz.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // apps/web: Next.js App Router — hem server hem client tarafında çalışır.
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // apps/worker, packages/core: salt Node.js runtime.
    files: ['apps/worker/**/*.ts', 'packages/core/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  eslintConfigPrettier,
);

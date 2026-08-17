import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Lint zaten ayrı, önceki bir CI job'unda çalışıyor (`pnpm -w lint`,
    // .claude/rules/04-quality-gates.md CI Gate §1) — build adımında tekrarı
    // hem eslint-config-next gerektirir hem de sıra bağlayıcı CI gate'ini gereksiz
    // yere tekrar eder.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Proje genelinde (Faz 2/3 — apps/worker, apps/web) relative import'lar açık
    // `.js` uzantısı kullanır ("moduleResolution": "bundler" ESM konvansiyonu).
    // Next'in webpack resolver'ı bunu varsayılan olarak kaynak .ts/.tsx dosyasına
    // eşlemez (yalnızca `tsc --noEmit`/Vite bunu örtük yapıyordu) — mevcut Faz 3
    // route/servis dosyalarına dokunmadan burada açıkça eklenir.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;

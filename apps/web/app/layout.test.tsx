import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// `RootLayout` artık `next/headers`'ın `headers()`'ını okuyan bir async Server
// Component (İterasyon 3, §5.3) — gerçek Next.js istek yaşam döngüsü dışında
// (bu test dosyası gibi) çağrılırsa hata fırlatır, bu yüzden mock'lanır
// (docs/07_SECURITY_IMPLEMENTATION.md §7 nonce deseni, middleware.ts `x-nonce`).
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-nonce': 'test-nonce' })),
}));

// Yukarıdaki `vi.mock` vitest tarafından hoist edilir (modül yüklenmeden önce
// uygulanır) — import sırası bu yüzden önemli değildir, okunabilirlik için
// mock'tan sonra bırakılmıştır.
import RootLayout from './layout';

// Kök layout artık yalnızca `<html>/<body>` kabuğudur (docs/06_SCREEN_CATALOG.md §2) —
// header/`DisclaimerFooter` her ekranın kendi sorumluluğuna taşındı (Faz 5 §5.2,
// `/admin`'in bunları içermemesi gerektiği için). Bu iki bileşenin gerçekten
// render edildiği yer artık `app/page.tsx`/`app/not-found.tsx`/`app/error.tsx`'tir.
describe('RootLayout', () => {
  it('renders children inside an <html lang="tr"> shell without injecting site chrome', async () => {
    const CHILD_TEXT = 'çocuk-içerik';
    const element = await RootLayout({ children: <p>{CHILD_TEXT}</p> });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('lang="tr"');
    expect(html).toContain(CHILD_TEXT);
    // Kök layout artık DisclaimerFooter/header'ı kendisi render etmez — bu
    // metinler yalnızca onları gerçekten çağıran ekranlarda ortaya çıkmalı.
    expect(html).not.toContain('Geçmiş performans gelecekteki getiriyi göstermez');
  });
});

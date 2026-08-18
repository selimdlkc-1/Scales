import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import RootLayout from './layout';

// Kök layout artık yalnızca `<html>/<body>` kabuğudur (docs/06_SCREEN_CATALOG.md §2) —
// header/`DisclaimerFooter` her ekranın kendi sorumluluğuna taşındı (Faz 5 §5.2,
// `/admin`'in bunları içermemesi gerektiği için). Bu iki bileşenin gerçekten
// render edildiği yer artık `app/page.tsx`/`app/not-found.tsx`/`app/error.tsx`'tir.
describe('RootLayout', () => {
  it('renders children inside an <html lang="tr"> shell without injecting site chrome', () => {
    const CHILD_TEXT = 'çocuk-içerik';
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>{CHILD_TEXT}</p>
      </RootLayout>,
    );

    expect(html).toContain('lang="tr"');
    expect(html).toContain(CHILD_TEXT);
    // Kök layout artık DisclaimerFooter/header'ı kendisi render etmez — bu
    // metinler yalnızca onları gerçekten çağıran ekranlarda ortaya çıkmalı.
    expect(html).not.toContain('Geçmiş performans gelecekteki getiriyi göstermez');
  });
});

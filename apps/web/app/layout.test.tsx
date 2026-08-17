import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import RootLayout from './layout';

describe('RootLayout', () => {
  it('renders DisclaimerFooter on every page (P-006)', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>içerik</p>
      </RootLayout>,
    );

    expect(html).toContain(
      'Geçmiş performans gelecekteki getiriyi göstermez. Bu sayfadaki bilgiler yatırım tavsiyesi niteliği taşımaz.',
    );
  });

  it('renders the "Terazi" header linking back to home', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>içerik</p>
      </RootLayout>,
    );

    expect(html).toContain('href="/"');
    expect(html).toContain('Terazi');
  });
});

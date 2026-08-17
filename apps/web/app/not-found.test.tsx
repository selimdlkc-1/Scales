import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import NotFound from './not-found';

describe('NotFound (S-404)', () => {
  it('renders the fixed S-404 message and a link back to home', () => {
    const html = renderToStaticMarkup(<NotFound />);

    expect(html).toContain('Aradığınız sayfa bulunamadı.');
    expect(html).toContain('href="/"');
    expect(html).toContain('Ana sayfaya dön');
  });
});

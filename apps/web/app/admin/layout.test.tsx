import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import AdminLayout from './layout';

describe('AdminLayout (S-OPERATOR-PANEL kabuğu)', () => {
  it('renders the "Terazi — Operatör Paneli" title and children', () => {
    const CHILD_TEXT = 'çocuk-içerik';
    const html = renderToStaticMarkup(
      <AdminLayout>
        <p>{CHILD_TEXT}</p>
      </AdminLayout>,
    );

    expect(html).toContain('Terazi — Operatör Paneli');
    expect(html).toContain(CHILD_TEXT);
  });

  it('does not render DisclaimerFooter or a link back to S-HOME ([AP-002] tek yönlü navigasyon)', () => {
    const html = renderToStaticMarkup(
      <AdminLayout>
        <p>içerik</p>
      </AdminLayout>,
    );

    expect(html).not.toContain('Geçmiş performans gelecekteki getiriyi göstermez');
    expect(html).not.toContain('href="/"');
  });
});

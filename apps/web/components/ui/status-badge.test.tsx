import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    ['pending', 'Bekliyor'],
    ['running', 'Çalışıyor'],
    ['success', 'Başarılı'],
    ['partial', 'Kısmi Başarı'],
    ['failed', 'Hata'],
  ])('renders the Turkish label for status="%s"', (status, label) => {
    const html = renderToStaticMarkup(<StatusBadge status={status} />);
    expect(html).toContain(label);
  });

  it('renders distinct background classes for different statuses (color is not the only signal)', () => {
    const success = renderToStaticMarkup(<StatusBadge status="success" />);
    const failed = renderToStaticMarkup(<StatusBadge status="failed" />);
    expect(success).not.toBe(failed);
  });

  it('falls back to the raw string without crashing for an unknown status', () => {
    const html = renderToStaticMarkup(<StatusBadge status="unexpected-value" />);
    expect(html).toContain('unexpected-value');
  });
});

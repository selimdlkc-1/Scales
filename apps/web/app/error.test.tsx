import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import ErrorScreen from './error';

describe('ErrorScreen (S-500)', () => {
  it('renders the fixed S-500 message and a reset button', () => {
    const html = renderToStaticMarkup(<ErrorScreen error={new Error('boom')} reset={() => {}} />);

    expect(html).toContain('Bir şeyler ters gitti. Lütfen tekrar deneyin.');
    expect(html).toContain('Sayfayı yenile');
  });

  it('accepts the Next.js error boundary props without throwing', () => {
    const reset = vi.fn();

    expect(() =>
      renderToStaticMarkup(<ErrorScreen error={new Error('boom')} reset={reset} />),
    ).not.toThrow();
  });
});

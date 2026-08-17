import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DisclaimerFooter } from './disclaimer-footer';

describe('DisclaimerFooter', () => {
  it('renders the fixed P-006 disclaimer text', () => {
    const html = renderToStaticMarkup(<DisclaimerFooter />);

    expect(html).toContain(
      'Geçmiş performans gelecekteki getiriyi göstermez. Bu sayfadaki bilgiler yatırım tavsiyesi niteliği taşımaz.',
    );
  });
});

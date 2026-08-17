import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DataState } from './data-state';

const CHILD_TEXT = 'çocuk-içerik';

describe('DataState', () => {
  it('renders children without a banner when status="success"', () => {
    const html = renderToStaticMarkup(
      <DataState status="success">
        <p>{CHILD_TEXT}</p>
      </DataState>,
    );

    expect(html).toContain(CHILD_TEXT);
    expect(html).not.toContain('role="alert"');
  });

  it('dims children (does not unmount them) when status="loading"', () => {
    const html = renderToStaticMarkup(
      <DataState status="loading">
        <p>{CHILD_TEXT}</p>
      </DataState>,
    );

    expect(html).toContain(CHILD_TEXT);
    expect(html).toContain('opacity-60');
  });

  it('renders an error banner above children and keeps previous data on screen', () => {
    const html = renderToStaticMarkup(
      <DataState status="error" error="Veriler yüklenirken bir sorun oluştu." onRetry={() => {}}>
        <p>{CHILD_TEXT}</p>
      </DataState>,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('Veriler yüklenirken bir sorun oluştu.');
    expect(html).toContain('Tekrar dene');
    // Önceki veri banner altında ekranda kalmaya devam eder — tamamen boşalmaz.
    expect(html).toContain(CHILD_TEXT);
  });

  it('does not render a retry button when onRetry is omitted', () => {
    const html = renderToStaticMarkup(
      <DataState status="error" error="Hata oluştu.">
        <p>{CHILD_TEXT}</p>
      </DataState>,
    );

    expect(html).not.toContain('Tekrar dene');
  });

  it('replaces children with the default empty message when status="empty"', () => {
    const html = renderToStaticMarkup(
      <DataState status="empty">
        <p>{CHILD_TEXT}</p>
      </DataState>,
    );

    expect(html).toContain('Bu dönem için veri bulunamadı.');
    expect(html).not.toContain(CHILD_TEXT);
  });

  it('supports a custom empty message', () => {
    const html = renderToStaticMarkup(
      <DataState status="empty" emptyMessage="Henüz çalıştırma kaydı yok.">
        <p>{CHILD_TEXT}</p>
      </DataState>,
    );

    expect(html).toContain('Henüz çalıştırma kaydı yok.');
  });
});

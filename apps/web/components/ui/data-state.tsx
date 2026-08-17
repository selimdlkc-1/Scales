'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

export type DataStateStatus = 'loading' | 'error' | 'empty' | 'success';

const DEFAULT_EMPTY_MESSAGE = 'Bu dönem için veri bulunamadı.';

export interface DataStateProps {
  status: DataStateStatus;
  /** `status="error"` iken gösterilecek mesaj (`error.message`, docs/05_FRONTEND_SPEC.md §4). */
  error?: string | null;
  /** "Tekrar dene" butonu — verilmezse buton render edilmez. */
  onRetry?: () => void;
  emptyMessage?: string;
  /**
   * `loading`/`error`/`success` içeriği — çağıran taraf `loading` sırasında
   * gösterilecek şeyi (mevcut içerik mi, skeleton mu) kendi belirler, `DataState`
   * yalnızca dim/banner davranışını ekler (bkz. aşağıdaki not).
   */
  children: ReactNode;
}

/**
 * S-HOME/S-OPERATOR-PANEL'in ortak loading/error/empty/success wrapper'ı
 * (docs/06_SCREEN_CATALOG.md §6, docs/05_FRONTEND_SPEC.md §4) — her yeni
 * veri-çeken component bu dört durumu ad-hoc `if` zinciriyle yeniden yazmaz.
 *
 * - `empty`: children hiç render edilmez, tek bir bilgi satırı gösterilir
 *   (docs/06 §4 "tablo satırları yerine tek bir bilgi satırı").
 * - `error`: kırmızı banner + "Tekrar dene" butonu children'ın **üstünde**
 *   render edilir; children unmount edilmez — önceki veri varsa ekranda kalır,
 *   sayfa tamamen boşalmaz (docs/06 §4 UX state notu).
 * - `loading`: children'a hafif bir opacity uygulanır (ani layout shift
 *   önlenir, docs/05 §4 `isPending` deseni) — ilk yüklemede (henüz hiç veri
 *   yokken) çağıran taraf `children` olarak bir skeleton geçer, böylece aynı
 *   dim davranışı skeleton üzerinde de tutarlı kalır.
 * - `success`: children olduğu gibi render edilir.
 */
export function DataState({
  status,
  error,
  onRetry,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  children,
}: DataStateProps) {
  if (status === 'empty') {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {status === 'error' && error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span>{error}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Tekrar dene
            </Button>
          )}
        </div>
      )}
      <div className={status === 'loading' ? 'opacity-60 transition-opacity' : undefined}>
        {children}
      </div>
    </div>
  );
}

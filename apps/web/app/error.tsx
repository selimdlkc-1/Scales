'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { DisclaimerFooter } from '@/components/ui/disclaimer-footer';

interface ErrorScreenProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// S-500 (docs/06_SCREEN_CATALOG.md §5) — Next.js'in route segment hata sınırı
// (`error.tsx`), zorunlu olarak Client Component'tir. Kök layout (`app/layout.tsx`)
// yalnızca `<html>/<body>` kabuğudur — kendi içindeki hataları yakalamaz, yalnızca
// altındaki segmentleri; `DisclaimerFooter` docs/06 §6 gereği burada açıkça render
// edilir (kök layout'tan miras alınmaz).
export default function ErrorScreen({ error, reset }: ErrorScreenProps) {
  useEffect(() => {
    // Harici bir error-tracking servisi kurulmaz ([P-008]) — bu yalnızca yerel
    // tanılama amaçlı standart Next.js `error.tsx` deseni.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bir şeyler ters gitti. Lütfen tekrar deneyin.
        </h1>
        <Button onClick={() => reset()}>Sayfayı yenile</Button>
      </div>
      <DisclaimerFooter />
    </div>
  );
}

'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

interface ErrorScreenProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// S-500 (docs/06_SCREEN_CATALOG.md §5) — Next.js'in route segment hata sınırı
// (`error.tsx`), zorunlu olarak Client Component'tir. Kök layout içinde render
// edilir (header/`DisclaimerFooter` korunur, docs/06 §2) — kök `layout.tsx`'in
// kendi içindeki hataları yakalamaz, yalnızca altındaki segmentleri.
export default function ErrorScreen({ error, reset }: ErrorScreenProps) {
  useEffect(() => {
    // Harici bir error-tracking servisi kurulmaz ([P-008]) — bu yalnızca yerel
    // tanılama amaçlı standart Next.js `error.tsx` deseni.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Bir şeyler ters gitti. Lütfen tekrar deneyin.
      </h1>
      <Button onClick={() => reset()}>Sayfayı yenile</Button>
    </div>
  );
}

import Link from 'next/link';

import { DisclaimerFooter } from '@/components/ui/disclaimer-footer';

// S-404 (docs/06_SCREEN_CATALOG.md §5) — eşleşmeyen tüm path'ler için Next.js'in
// özel `not-found.tsx` konvansiyonu. Kök layout (`app/layout.tsx`) yalnızca
// `<html>/<body>` kabuğudur — `DisclaimerFooter` docs/06 §6 gereği burada
// açıkça render edilir (kök layout'tan miras alınmaz).
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Aradığınız sayfa bulunamadı.</h1>
        <Link
          href="/"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ana sayfaya dön
        </Link>
      </div>
      <DisclaimerFooter />
    </div>
  );
}

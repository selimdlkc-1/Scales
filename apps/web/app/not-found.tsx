import Link from 'next/link';

// S-404 (docs/06_SCREEN_CATALOG.md §5) — eşleşmeyen tüm path'ler için Next.js'in
// özel `not-found.tsx` konvansiyonu. Kök layout (`app/layout.tsx`) içinde render
// edilir, bu yüzden header ve `DisclaimerFooter` ayrıca eklenmez (docs/06 §2).
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Aradığınız sayfa bulunamadı.</h1>
      <Link
        href="/"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Ana sayfaya dön
      </Link>
    </div>
  );
}

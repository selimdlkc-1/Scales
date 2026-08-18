import type { Metadata } from 'next';

// S-OPERATOR-PANEL kabuğu (docs/05_FRONTEND_SPEC.md §1-2, docs/06_SCREEN_CATALOG.md §2) —
// kök `app/layout.tsx`'ten (yalnızca html/body kabuğu) sonra gelen, bu route'a özel
// sade operatör kabuğu. Kasıtlı olarak İÇERMEZ:
// - Kullanıcı navigasyonu / S-HOME'a link — [AP-002]: panel keşfedilebilir bir UI
//   elemanı değildir, doğrudan `/admin` path'i bilinerek erişilir; navigasyon tek
//   yönlüdür (S-HOME'dan da buraya link yoktur, docs/06 §2).
// - `DisclaimerFooter` — operatöre yöneliktir, yatırımcı uyarı metni burada anlamsız
//   (docs/06 §6 tablosu `DisclaimerFooter`'ı yalnızca S-HOME/S-404/S-500 için listeler).
export const metadata: Metadata = {
  title: 'Terazi — Operatör Paneli',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Terazi — Operatör Paneli</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

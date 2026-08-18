import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Terazi',
  description:
    'Döviz, gram altın, kripto ve TEFAS yatırım fonlarının TL bazında reel getirisini karşılaştıran, read-only vitrin.',
};

// Kök layout — YALNIZCA `<html>/<body>` kabuğu, font/global stil (docs/05_FRONTEND_SPEC.md
// §1). Next.js App Router'da yalnızca kök layout `<html>/<body>` render edebilir; her route
// (S-HOME, S-OPERATOR-PANEL, S-404, S-500 dahil) buradan geçer. Bu yüzden site-özel chrome
// (header nav linki, `DisclaimerFooter`) BİLİNÇLİ OLARAK burada YOKTUR — her ekran kendi
// gereksinimine göre kendi chrome'unu render eder (docs/06_SCREEN_CATALOG.md §2, §6):
// - S-HOME (`app/page.tsx`): header + `DisclaimerFooter`
// - S-404 (`app/not-found.tsx`), S-500 (`app/error.tsx`): yalnızca `DisclaimerFooter`
// - S-OPERATOR-PANEL (`app/admin/layout.tsx`): hiçbiri — kullanıcı navigasyonu/
//   `DisclaimerFooter` içermez, S-HOME'a geri link vermez ([AP-002] tek yönlü navigasyon).
// Bu ayrım olmadan kök layout'un sabit header/footer'ı `/admin`'e de sızar ve docs'taki
// "operatör paneli navigasyon/DisclaimerFooter içermez" gereksinimini ihlal eder.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}

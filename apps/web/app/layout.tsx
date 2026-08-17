import type { Metadata } from 'next';
import Link from 'next/link';

import { DisclaimerFooter } from '@/components/ui/disclaimer-footer';

import './globals.css';

export const metadata: Metadata = {
  title: 'Terazi',
  description:
    'Döviz, gram altın, kripto ve TEFAS yatırım fonlarının TL bazında reel getirisini karşılaştıran, read-only vitrin.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center px-4 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Terazi
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <DisclaimerFooter />
      </body>
    </html>
  );
}

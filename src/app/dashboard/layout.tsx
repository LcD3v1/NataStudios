import type { Metadata } from 'next';
import { Sora, Inter } from 'next/font/google';
import '../globals.css';

const display = Sora({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-sora'
});

const sans = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Plataforma NATA',
  description: 'Área interna da NATA STUDIOS',
  robots: { index: false, follow: false }
};

// Root layout for the (non-localized) dashboard subtree.
export default function DashboardRootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

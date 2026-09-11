import type { Metadata } from 'next';
import './globals.css';

import { CinematicIntro } from '@/components/CinematicIntro';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';

export const metadata: Metadata = {
  title: 'ASLAN MODELLING | تنجيد • خياطة • تفصيل',
  description:
    'ASLAN MODELLING — تنجيد، خياطة، تفصيل وتجهيزات مخصصة.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <CinematicIntro />
        <Navbar />
        {children}
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
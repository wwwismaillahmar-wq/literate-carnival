import type { Metadata } from 'next';
import { cookies } from 'next/headers';
// The root layout remains request-aware for the locale cookie; cache only public settings.
import { resolveLocale, localeDirection } from '@/lib/i18n/core';
import './globals.css';
import { CinematicIntro } from '@/components/CinematicIntro';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { AnalyticsConsent } from '@/components/AnalyticsConsent';
import { SpeedInsights } from '@vercel/speed-insights/next';

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://literate-carnival-lemon.vercel.app').replace(/\/$/,'');
export const metadata:Metadata={
 metadataBase:new URL(siteUrl),
 title:{default:'ASLAN Modelling Group | تنجيد • خياطة • تفصيل',template:'%s | ASLAN Modelling Group'},
 description:'ASLAN Modelling Group — تنجيد، خياطة، تفصيل، منتجات وخدمات وتكوين مهني.',
 applicationName:'ASLAN Modelling Group',
 openGraph:{type:'website',locale:'ar_DZ',siteName:'ASLAN Modelling Group',title:'ASLAN Modelling Group',description:'نبني الجودة. نصنع الثقة.',url:siteUrl},
 robots:{index:true,follow:true},
};
export default async function RootLayout({children}:{children:React.ReactNode}) {
 const locale=resolveLocale((await cookies()).get('aslan-language')?.value);
 return <html lang={locale} dir={localeDirection(locale)}><body><CinematicIntro/><Navbar/>{children}<Footer/><WhatsAppButton/><AnalyticsConsent/><SpeedInsights/></body></html>;
}

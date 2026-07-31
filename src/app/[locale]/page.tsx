import { setRequestLocale } from 'next-intl/server';
import { Navbar } from '@/components/nav/Navbar';
import { Hero } from '@/components/sections/Hero';
import { TechStack } from '@/components/sections/TechStack';
import { Positioning } from '@/components/sections/Positioning';
import { Bento } from '@/components/sections/Bento';
import { Services } from '@/components/sections/Services';
import { WhyChooseUs } from '@/components/sections/WhyChooseUs';
import { CTA } from '@/components/sections/CTA';
import { Footer } from '@/components/layout/Footer';

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TechStack />
        <Positioning />
        <Bento />
        <Services />
        <WhyChooseUs />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

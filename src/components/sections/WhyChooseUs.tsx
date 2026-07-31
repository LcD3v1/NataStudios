'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Palette,
  Code2,
  Gauge,
  ShieldCheck,
  MousePointerClick,
  TrendingUp,
  type LucideIcon
} from 'lucide-react';
import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';

const ICONS: LucideIcon[] = [
  Palette,
  Code2,
  Gauge,
  ShieldCheck,
  MousePointerClick,
  TrendingUp
];

type Item = { title: string; description: string };

export function WhyChooseUs() {
  const t = useTranslations('why');
  const items = t.raw('items') as Item[];

  return (
    <section id="why" className="relative overflow-hidden border-y border-line bg-ink-2 py-24 sm:py-28">
      {/* generated atmospheric texture */}
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <Image
          src="/images/texture-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-50"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-fade-b opacity-30" />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{t('eyebrow')}</span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-muted sm:text-lg">{t('body')}</p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const Icon = ICONS[index] ?? Code2;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="glass group rounded-2xl p-6 transition-transform hover:-translate-y-1"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent transition-colors group-hover:text-white">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

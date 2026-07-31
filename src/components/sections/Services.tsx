'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Code2, Megaphone, Target, Boxes, type LucideIcon } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';

type ServiceKey = 'web' | 'social' | 'traffic' | 'systems';

const CONFIG: Record<ServiceKey, { icon: LucideIcon; accent: string }> = {
  web: { icon: Code2, accent: 'text-accent' },
  social: { icon: Megaphone, accent: 'text-accent-2' },
  traffic: { icon: Target, accent: 'text-accent' },
  systems: { icon: Boxes, accent: 'text-accent-2' }
};

const ORDER: ServiceKey[] = ['web', 'social', 'traffic', 'systems'];

export function Services() {
  const t = useTranslations('services');

  return (
    <section id="solutions" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{t('eyebrow')}</span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-muted sm:text-lg">{t('subtitle')}</p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {ORDER.map((key, index) => {
            const { icon: Icon, accent } = CONFIG[key];
            const items = t.raw(`${key}.items`) as string[];

            return (
              <motion.article
                key={key}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.015 }}
                className="group glass relative overflow-hidden rounded-3xl p-7 transition-colors hover:border-line-strong"
              >
                {/* hover glow */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-white/5">
                    <Icon size={22} className={accent} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{t(`${key}.name`)}</h3>
                    <p className="text-sm text-muted">{t(`${key}.description`)}</p>
                  </div>
                </div>

                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                      <Check size={16} className={`mt-0.5 shrink-0 ${accent}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

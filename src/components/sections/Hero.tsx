'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AmbientBlobs } from '@/components/ui/AmbientBlobs';

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const t = useTranslations('hero');

  const stats = [
    { value: t('stats.deliveryValue'), label: t('stats.delivery') },
    { value: t('stats.focusValue'), label: t('stats.focus') },
    { value: t('stats.stackValue'), label: t('stats.stack') }
  ];

  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Backdrop: generated visual + grid + animated cinematic light */}
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <Image
          src="/images/hero-visual.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
        />
        {/* dark overlay keeps headline readable over the visual */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/60 to-ink" />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-radial opacity-50" />
      <AmbientBlobs variant="hero" />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="eyebrow"
          >
            <Sparkles size={13} />
            {t('badge')}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
            className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl"
          >
            {t('titleLead')}{' '}
            <span className="text-gradient">{t('titleHighlight')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: EASE }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
          >
            {t('subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: EASE }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <a href="#contact" className="btn-primary w-full sm:w-auto">
              {t('ctaPrimary')}
              <ArrowRight size={18} />
            </a>
            <a href="#solutions" className="btn-ghost w-full sm:w-auto">
              {t('ctaSecondary')}
            </a>
          </motion.div>
        </div>

        {/* Punchline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mx-auto mt-16 max-w-2xl text-center"
        >
          <p className="font-display text-xl font-semibold text-white/70 sm:text-2xl">
            {t('punchLead')}
          </p>
          <p className="font-display text-xl font-semibold sm:text-2xl">
            <span className="text-gradient">{t('punchHighlight')}</span>
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4"
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="glass rounded-2xl px-4 py-5 text-center"
            >
              <div className="font-display text-xl font-bold text-gradient sm:text-2xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs text-muted sm:text-sm">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

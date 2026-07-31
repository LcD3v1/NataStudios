import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/ui/Reveal';
import { Code2, LineChart } from 'lucide-react';

export function Positioning() {
  const t = useTranslations('positioning');

  return (
    <section className="relative border-y border-line bg-ink-2 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">{t('eyebrow')}</span>
          <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {t('body')}
          </p>
        </Reveal>

        <div className="mt-12 flex items-center justify-center gap-3 text-sm text-muted">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-4 py-2">
            <Code2 size={16} className="text-accent" />
            {t('tagLeft')}
          </span>
          <span className="h-px w-8 bg-line-strong" />
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-4 py-2">
            <LineChart size={16} className="text-accent-2" />
            {t('tagRight')}
          </span>
        </div>
      </div>
    </section>
  );
}

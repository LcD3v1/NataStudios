import { useT } from '@/i18n';
import { motion } from 'framer-motion';
import {
  Code2,
  MousePointerClick,
  Gauge,
  LayoutDashboard,
  Target,
  Workflow,
  ArrowUpRight,
  type LucideIcon
} from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';

const EASE = [0.16, 1, 0.3, 1] as const;

type CellKey = 'conversion' | 'performance' | 'saas' | 'traffic' | 'automation';

const CELLS: { key: CellKey; icon: LucideIcon; span: string; accent: string }[] = [
  { key: 'conversion', icon: MousePointerClick, span: 'lg:col-span-2', accent: 'text-accent' },
  { key: 'performance', icon: Gauge, span: 'lg:col-span-1', accent: 'text-accent-2' },
  { key: 'saas', icon: LayoutDashboard, span: 'lg:col-span-1', accent: 'text-accent' },
  { key: 'traffic', icon: Target, span: 'lg:col-span-2', accent: 'text-accent-2' },
  { key: 'automation', icon: Workflow, span: 'lg:col-span-2', accent: 'text-accent' }
];

function Card({
  children,
  className = '',
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      whileHover={{ scale: 1.02 }}
      className={`glass group relative overflow-hidden rounded-3xl p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function Bento() {
  const t = useT('bento');

  return (
    <section className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{t('eyebrow')}</span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-muted sm:text-lg">{t('subtitle')}</p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Featured cell â€” spans 2x2 on desktop */}
          <Card className="sm:col-span-2 lg:col-span-2 lg:row-span-2 flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-white/5">
                <Code2 size={22} className="text-accent" />
              </span>
              <h3 className="mt-6 font-display text-2xl font-bold leading-tight sm:text-3xl">
                {t('featured.title')}
              </h3>
              <p className="mt-3 max-w-md text-muted">{t('featured.body')}</p>
            </div>
            {/* mini code-flow visual */}
            <div className="relative mt-8 flex items-center gap-2 text-xs text-subtle">
              {['git', 'build', 'deploy', 'convert'].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="rounded-md border border-line bg-white/5 px-2.5 py-1 font-mono">
                    {step}
                  </span>
                  {i < 3 && <span className="text-accent">â†’</span>}
                </div>
              ))}
            </div>
          </Card>

          {CELLS.map(({ key, icon: Icon, span, accent }, i) => (
            <Card key={key} className={span} delay={0.05 * (i + 1)}>
              <ArrowUpRight
                size={18}
                className="absolute right-5 top-5 text-subtle opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white/5">
                <Icon size={20} className={accent} />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold">
                {t(`cells.${key}.title`)}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {t(`cells.${key}.body`)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

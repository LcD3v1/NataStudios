import { useTranslations } from 'next-intl';

const STACK = [
  'Next.js',
  'TypeScript',
  'React',
  'Tailwind CSS',
  'Node.js',
  'PostgreSQL',
  'Framer Motion'
];

/**
 * Quiet credibility strip — signals real engineering behind the studio.
 */
export function TechStack() {
  const t = useTranslations('stack');

  return (
    <section className="border-y border-line bg-ink-2/60 py-10">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-subtle">
          {t('label')}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {STACK.map((tech) => (
            <span
              key={tech}
              className="font-display text-sm font-semibold text-muted transition-colors hover:text-white"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

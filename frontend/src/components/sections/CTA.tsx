import { motion } from 'framer-motion';
import { MessageCircle, Mail } from 'lucide-react';
import { useT } from '@/i18n';
import { site } from '@/lib/site';
import { ContactForm } from '@/components/ui/ContactForm';

export function CTA() {
  const t = useT('cta');

  return (
    <section id="contact" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[2rem] border border-line-strong p-8 sm:p-12"
        >
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-surface-2 to-ink" />
            <div className="absolute left-1/4 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/25 blur-[110px]" />
            <div className="absolute inset-0 bg-grid opacity-30 mask-fade-b" />
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="eyebrow">{t('eyebrow')}</span>
              <h2 className="mt-5 max-w-md font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {t('title')}
              </h2>
              <p className="mt-4 max-w-md text-muted sm:text-lg">{t('body')}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <a
                  href={site.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  <MessageCircle size={18} />
                  {t('primary')}
                </a>
                <a href={`mailto:${site.email}`} className="btn-ghost">
                  <Mail size={18} />
                  {t('secondary')}
                </a>
              </div>
            </div>

            <ContactForm />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

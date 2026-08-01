import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useT } from '@/i18n';
import { Logo } from '@/components/ui/Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { clsx } from '@/lib/clsx';

const LINKS = [
  { id: 'solutions', href: '#solutions' },
  { id: 'why', href: '#why' },
  { id: 'contact', href: '#contact' }
] as const;

export function Navbar() {
  const t = useT('nav');
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled ? 'border-b border-line bg-ink/80 backdrop-blur-xl' : 'border-b border-transparent'
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <a href="#top" className="shrink-0">
          <Logo height={34} />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-white"
            >
              {t(link.id)}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <a href="#contact" className="btn-primary hidden !px-4 !py-2 text-sm sm:inline-flex">
            {t('cta')}
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-white md:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-line bg-ink/95 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-1 px-5 py-4">
            {LINKS.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-white"
              >
                {t(link.id)}
              </a>
            ))}
            <a href="#contact" onClick={() => setOpen(false)} className="btn-primary mt-2 text-sm">
              {t('cta')}
            </a>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}

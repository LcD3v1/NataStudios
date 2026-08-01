import { useT, useI18n } from '@/i18n';
import { Logo } from '@/components/ui/Logo';
import { site } from '@/lib/site';

export function Footer() {
  const t = useT('footer');
  const tNav = useT('nav');
  const tServices = useT('services');
  const { locale } = useI18n();
  const year = new Date().getFullYear();

  const serviceLinks = [
    tServices('web.name'),
    tServices('social.name'),
    tServices('traffic.name'),
    tServices('systems.name')
  ];

  return (
    <footer className="border-t border-line bg-ink-2" key={locale}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Logo height={44} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">{t('tagline')}</p>
            <div className="mt-5 flex flex-col gap-1.5 text-sm text-muted">
              <a href={`mailto:${site.email}`} className="transition-colors hover:text-white">
                {site.email}
              </a>
              <a
                href={site.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                {site.phoneDisplay}
              </a>
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="text-sm font-semibold text-white">{t('solutions')}</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {serviceLinks.map((label) => (
                <li key={label}>
                  <a href="#solutions" className="transition-colors hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white">{t('company')}</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li>
                <a href="#why" className="transition-colors hover:text-white">
                  {t('why')}
                </a>
              </li>
              <li>
                <a href="#contact" className="transition-colors hover:text-white">
                  {tNav('contact')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-subtle sm:flex-row">
          <p>
            © {year} {site.name}. {t('rights')}
          </p>
          <p>{t('madeWith')}</p>
        </div>
      </div>
    </footer>
  );
}

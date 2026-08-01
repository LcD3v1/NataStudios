import { useI18n, type Locale } from '@/i18n';
import { clsx } from '@/lib/clsx';

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' }
];

/** Switches language instantly — the whole app re-renders from context, no reload. */
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-line-strong bg-white/5 p-1 text-xs font-semibold"
      role="group"
      aria-label="Idioma"
    >
      {LOCALES.map(({ code, label }) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={clsx(
              'rounded-full px-2.5 py-1 transition-colors',
              active ? 'bg-white text-ink' : 'text-muted hover:text-white'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

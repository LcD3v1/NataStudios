import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import pt from './pt.json';
import en from './en.json';

export type Locale = 'pt' | 'en';

const MESSAGES: Record<Locale, unknown> = { pt, en };
const STORAGE_KEY = 'nata_locale';

/** Reads `a.b.c` from the message tree. Returns undefined when missing. */
function lookup(tree: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as never)[key] : undefined), tree);
}

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translated string; falls back to the key so a typo is visible, not silent. */
  t: (key: string) => string;
  /** Raw value — use for arrays/objects (lists of items). */
  raw: <T,>(key: string) => T;
};

const I18nContext = createContext<I18nValue | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'pt';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'pt' || stored === 'en') return stored;
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'pt';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const value = useMemo<I18nValue>(() => {
    const tree = MESSAGES[locale];
    return {
      locale,
      setLocale: (next) => {
        setLocaleState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next;
      },
      t: (key) => {
        const found = lookup(tree, key);
        return typeof found === 'string' ? found : key;
      },
      raw: <T,>(key: string) => lookup(tree, key) as T
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n precisa estar dentro de <I18nProvider>');
  return ctx;
}

/** Scoped helper: `const t = useT('hero')` → `t('title')`. */
export function useT(namespace: string) {
  const { t, raw } = useI18n();
  const scoped = (key: string) => t(`${namespace}.${key}`);
  scoped.raw = <T,>(key: string) => raw<T>(`${namespace}.${key}`);
  return scoped;
}

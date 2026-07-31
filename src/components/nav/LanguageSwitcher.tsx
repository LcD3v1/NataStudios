'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { clsx } from '@/lib/clsx';

const LABELS: Record<string, string> = {
  pt: 'PT',
  en: 'EN'
};

/**
 * Toggles between the available locales. Uses next-intl's locale-aware router,
 * so the switch is a client-side transition — the page does NOT fully reload.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: string) {
    if (next === locale) return;
    startTransition(() => {
      // `pathname` here is already locale-agnostic; router handles the prefix.
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-1 rounded-full border border-line-strong bg-white/5 p-1 text-xs font-semibold',
        isPending && 'opacity-60'
      )}
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchTo(code)}
            aria-pressed={active}
            className={clsx(
              'rounded-full px-2.5 py-1 transition-colors',
              active
                ? 'bg-white text-ink'
                : 'text-muted hover:text-white'
            )}
          >
            {LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}

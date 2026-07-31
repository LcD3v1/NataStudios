import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // Supported locales. Add new languages here — the rest of the app adapts automatically.
  locales: ['pt', 'en'],

  // Used when no locale matches.
  defaultLocale: 'pt',

  // Keep URLs clean: the default locale (pt) has no prefix, `/en` for English.
  localePrefix: 'as-needed'
});

export type Locale = (typeof routing.locales)[number];

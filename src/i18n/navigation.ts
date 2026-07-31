import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware navigation APIs. Using these instead of the ones from `next/navigation`
// keeps the active locale in the URL and enables client-side (no full reload) transitions.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

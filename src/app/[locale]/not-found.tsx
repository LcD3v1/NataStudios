import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('nav');

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-7xl font-extrabold text-gradient">404</p>
      <p className="mt-4 max-w-sm text-muted">
        This page could not be found.
      </p>
      <Link href="/" className="btn-primary mt-8">
        {t('cta')}
      </Link>
    </main>
  );
}

import './globals.css';

/**
 * Global fallback for routes that never reach the [locale] segment.
 * Because there is no root layout with <html>, this renders its own document.
 */
export default function GlobalNotFound() {
  return (
    <html lang="pt">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <p className="font-display text-7xl font-extrabold text-gradient">404</p>
          <p className="mt-4 max-w-sm text-muted">This page could not be found.</p>
          <a href="/" className="btn-primary mt-8">
            Back home
          </a>
        </main>
      </body>
    </html>
  );
}

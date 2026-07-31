import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Content-Security-Policy.
 * - `next/font` self-hosts fonts (served from 'self'), the browser never calls Google.
 * - Resend is called server-side only, so `connect-src 'self'` is enough.
 * - `'unsafe-inline'` for scripts/styles is required by Next's inline hydration bootstrap
 *   and framer-motion inline styles. `'unsafe-eval'` is dev-only (React Fast Refresh).
 *   For maximum strictness, upgrade to a per-request nonce in middleware (see docs/SECURITY.md).
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self'",
  "frame-src 'none'",
  "manifest-src 'self'",
  'upgrade-insecure-requests'
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Force HTTPS for 2 years, include subdomains, allow preload list.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()'
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output is only for the Docker/VPS image (started via
  // `node server.js`). Platforms that run `next start` (e.g. ShardCloud) must
  // NOT use it — Next refuses to combine the two. The Dockerfile sets this.
  ...(process.env.BUILD_STANDALONE === '1' ? { output: 'standalone' } : {}),
  // Do not advertise the framework/version.
  poweredByHeader: false,
  // Hide the Next.js dev overlay indicator (dev only).
  devIndicators: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};

export default withNextIntl(nextConfig);

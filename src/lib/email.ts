import { Resend } from 'resend';

/**
 * Lazily-created Resend client. Returns null when the API key is missing so the
 * route can respond with a clear error instead of crashing at import time.
 */
let client: Resend | null = null;

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export const emailConfig = {
  from: process.env.RESEND_FROM ?? 'NATA STUDIOS <onboarding@resend.dev>',
  to: process.env.CONTACT_TO_EMAIL ?? ''
};

/** Minimal HTML escaping so user input can't break the email markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

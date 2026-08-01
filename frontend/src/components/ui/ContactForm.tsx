import { useState } from 'react';
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useT } from '@/i18n';
import { api } from '@/lib/api';
import { COUNTRIES, DEFAULT_COUNTRY, findCountry } from '@/lib/countries';

type Status = 'idle' | 'sending' | 'success' | 'error';
type Fields = { name: string; email: string; phone: string; message: string };

const EMPTY: Fields = { name: '', email: '', phone: '', message: '' };

export function ContactForm() {
  const t = useT('cta.form');
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [company, setCompany] = useState(''); // honeypot
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Status>('idle');

  const selected = findCountry(country);

  function update(key: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: false }));
  }

  /** Mirrors the server-side zod rules so the user gets instant feedback. */
  function validate(): Record<string, boolean> {
    const errs: Record<string, boolean> = {};
    if (fields.name.trim().length < 2) errs.name = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errs.email = true;
    if (fields.message.trim().length < 10) errs.message = true;
    return errs;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      setStatus('error');
      return;
    }

    setStatus('sending');
    try {
      await api.post('/contact', {
        ...fields,
        // Send the phone already prefixed so the lead is reachable internationally.
        phone: fields.phone.trim() ? `+${selected.dial} ${fields.phone.trim()}` : '',
        company
      });
      setStatus('success');
      setFields(EMPTY);
    } catch {
      setStatus('error');
    }
  }

  const inputBase =
    'w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-subtle outline-none transition-colors focus:border-accent';
  const cls = (key: keyof Fields) =>
    `${inputBase} ${errors[key] ? 'border-red-500/70' : 'border-line'}`;

  if (status === 'success') {
    return (
      <div className="glass flex min-h-[320px] flex-col items-center justify-center rounded-3xl p-8 text-center">
        <CheckCircle2 className="text-accent" size={44} />
        <p className="mt-4 max-w-xs font-display text-lg font-semibold">{t('success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="glass rounded-3xl p-6 sm:p-7">
      <h3 className="font-display text-lg font-semibold">{t('heading')}</h3>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="cf-name" className="mb-1.5 block text-sm text-muted">
            {t('name')}
          </label>
          <input
            id="cf-name"
            type="text"
            autoComplete="name"
            value={fields.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t('namePlaceholder')}
            className={cls('name')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cf-email" className="mb-1.5 block text-sm text-muted">
              {t('email')}
            </label>
            <input
              id="cf-email"
              type="email"
              autoComplete="email"
              value={fields.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder={t('emailPlaceholder')}
              className={cls('email')}
            />
          </div>
          <div>
            <label htmlFor="cf-phone" className="mb-1.5 block text-sm text-muted">
              {t('phone')}
            </label>
            <div className="flex gap-2">
              {/* Fixed width — can't reuse inputBase, whose w-full would fight it. */}
              <select
                aria-label={t('country')}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-[92px] shrink-0 rounded-xl border border-line bg-white/[0.03] px-2 py-3 text-sm text-white outline-none transition-colors focus:border-accent"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} +{c.dial}
                  </option>
                ))}
              </select>
              <input
                id="cf-phone"
                type="tel"
                autoComplete="tel"
                value={fields.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder={selected.placeholder}
                className={`${cls('phone')} min-w-0 flex-1`}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="cf-message" className="mb-1.5 block text-sm text-muted">
            {t('message')}
          </label>
          <textarea
            id="cf-message"
            rows={4}
            value={fields.message}
            onChange={(e) => update('message', e.target.value)}
            placeholder={t('messagePlaceholder')}
            className={`${cls('message')} resize-y`}
          />
        </div>

        {/* Honeypot: hidden from users, catches bots */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {status === 'error' && (
        <p className="mt-4 flex items-center gap-2 text-sm text-red-400" role="alert">
          <AlertCircle size={16} />
          {Object.keys(errors).length ? t('invalid') : t('error')}
        </p>
      )}

      <button type="submit" disabled={status === 'sending'} className="btn-primary mt-6 w-full">
        {status === 'sending' ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t('sending')}
          </>
        ) : (
          <>
            <Send size={18} />
            {t('submit')}
          </>
        )}
      </button>
    </form>
  );
}

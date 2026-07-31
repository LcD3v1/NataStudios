'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const MESSAGES: Record<string, string> = {
    credentials: 'E-mail ou senha incorretos.',
    mfa_invalid: 'Código de verificação inválido.',
    account_locked:
      'Conta temporariamente bloqueada por tentativas excessivas. Tente novamente em alguns minutos.',
    too_many_requests: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    generic: 'Não foi possível entrar. Tente novamente.'
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totp: totp || undefined })
      });

      if (res.ok) {
        router.replace('/dashboard');
        router.refresh();
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      // Password was right; the account needs its second factor.
      if (data.error === 'mfa_required') {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      setError(MESSAGES[data.error ?? 'generic'] ?? MESSAGES.generic!);
      setLoading(false);
    } catch {
      setError(MESSAGES.generic!);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo height={40} />
        </div>

        <form onSubmit={onSubmit} className="glass rounded-3xl p-7">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted">
            <Lock size={15} className="text-accent" />
            Acesso à Plataforma NATA
          </div>

          <label htmlFor="email" className="mb-1.5 block text-sm text-muted">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mb-4 w-full rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-accent"
          />

          <label htmlFor="password" className="mb-1.5 block text-sm text-muted">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-accent"
          />

          {mfaRequired && (
            <div className="mt-4">
              <label htmlFor="totp" className="mb-1.5 block text-sm text-muted">
                Código de verificação (2FA)
              </label>
              <input
                id="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                placeholder="000000"
                required
                className="w-full rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-center font-mono text-sm tracking-[0.3em] text-white outline-none transition-colors focus:border-accent"
              />
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 w-full disabled:opacity-70"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}

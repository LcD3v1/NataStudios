import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { api, ApiError } from '@/lib/api';

const MESSAGES: Record<string, string> = {
  credentials: 'E-mail ou senha incorretos.',
  mfa_invalid: 'Código de verificação inválido.',
  account_locked:
    'Conta temporariamente bloqueada por tentativas excessivas. Tente novamente em alguns minutos.',
  too_many_requests: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  generic: 'Não foi possível entrar. Tente novamente.'
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/login', { email, password, totp: totp || undefined });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'generic';
      // Password was right; the account needs its second factor.
      if (code === 'mfa_required') {
        setMfaRequired(true);
      } else {
        setError(MESSAGES[code] ?? MESSAGES.generic!);
      }
      setLoading(false);
    }
  }

  const input =
    'w-full rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-accent';

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5">
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
            className={`${input} mb-4`}
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
            className={input}
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
                className={`${input} text-center font-mono tracking-[0.3em]`}
              />
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}

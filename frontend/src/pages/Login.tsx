import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, UserPlus } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { api, ApiError } from '@/lib/api';

const LOGIN_ERRORS: Record<string, string> = {
  credentials: 'E-mail ou senha incorretos.',
  mfa_invalid: 'Código de verificação inválido.',
  account_locked:
    'Conta temporariamente bloqueada por tentativas excessivas. Tente novamente em alguns minutos.',
  too_many_requests: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  generic: 'Não foi possível entrar. Tente novamente.'
};

const SETUP_ERRORS: Record<string, string> = {
  nome: 'Informe seu nome (mínimo 2 caracteres).',
  email: 'Informe um e-mail válido.',
  senha_curta: 'A senha precisa ter no mínimo 8 caracteres.',
  ja_configurado: 'O administrador já existe. Recarregue a página para entrar.',
  too_many_requests: 'Muitas tentativas. Aguarde alguns minutos.',
  generic: 'Não foi possível criar a conta. Tente novamente.'
};

const input =
  'w-full rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-accent';

export default function Login() {
  const navigate = useNavigate();

  // null = ainda verificando se o sistema já tem administrador
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    api
      .get<{ needsSetup: boolean }>('/auth/setup-status')
      .then((r) => setNeedsSetup(r.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/login', { email, password, totp: totp || undefined });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'generic';
      if (code === 'mfa_required') {
        setMfaRequired(true);
      } else {
        setError(LOGIN_ERRORS[code] ?? LOGIN_ERRORS.generic!);
      }
      setLoading(false);
    }
  }

  async function onSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/setup', { name, email, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'generic';
      setError(SETUP_ERRORS[code] ?? SETUP_ERRORS.generic!);
      if (code === 'ja_configurado') setNeedsSetup(false);
      setLoading(false);
    }
  }

  if (needsSetup === null) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo height={40} />
        </div>

        {needsSetup ? (
          /* ---------- Primeiro acesso: cria o administrador ---------- */
          <form onSubmit={onSetup} className="glass rounded-3xl p-7">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted">
              <UserPlus size={15} className="text-accent" />
              Primeiro acesso
            </div>
            <p className="mb-6 text-xs leading-relaxed text-subtle">
              Nenhum administrador cadastrado ainda. Crie o seu abaixo — esta tela só
              aparece uma vez.
            </p>

            <label htmlFor="name" className="mb-1.5 block text-sm text-muted">
              Seu nome
            </label>
            <input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={`${input} mb-4`}
            />

            <label htmlFor="setup-email" className="mb-1.5 block text-sm text-muted">
              E-mail
            </label>
            <input
              id="setup-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`${input} mb-4`}
            />

            <label htmlFor="setup-password" className="mb-1.5 block text-sm text-muted">
              Senha
            </label>
            <input
              id="setup-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={input}
            />
            <p className="mt-1.5 text-xs text-subtle">Mínimo de 8 caracteres.</p>

            {error && (
              <p className="mt-4 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Criar administrador'}
            </button>
          </form>
        ) : (
          /* ---------- Login normal ---------- */
          <form onSubmit={onLogin} className="glass rounded-3xl p-7">
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
        )}
      </div>
    </main>
  );
}

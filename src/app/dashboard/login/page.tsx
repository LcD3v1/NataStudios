'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error();
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError(true);
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

          {error && (
            <p className="mt-4 text-sm text-red-400" role="alert">
              E-mail ou senha incorretos.
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
